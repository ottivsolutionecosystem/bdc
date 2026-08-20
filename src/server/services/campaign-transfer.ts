import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-error";
import type { SessionUser } from "@/lib/permissions";
import { recordAudit } from "@/server/services/audit";
import { assertCampaignOperable } from "@/lib/campaign-lifecycle";
import type { TransferToSalesInput } from "@/schemas/attempt";

/**
 * Transfere um contato qualificado para um vendedor. Cria (ou reaproveita)
 * uma Opportunity vinculada ao cliente/campanha — não duplica o conceito de
 * negociação caso o CRM já tenha uma para este cliente.
 */
export async function transferContactToSales(
  user: SessionUser,
  campaignId: string,
  contactId: string,
  input: TransferToSalesInput
) {
  await assertCampaignOperable(campaignId);

  const contact = await prisma.campaignContact.findUnique({ where: { id: contactId } });
  if (!contact || contact.campaignId !== campaignId) {
    throw new ApiError(404, "Contato não encontrado nesta campanha");
  }
  if (user.role === "AGENT" && contact.assignedAgentId !== user.id) {
    throw new ApiError(403, "Este contato não está atribuído a você");
  }

  const seller = await prisma.user.findUnique({ where: { id: input.sellerId } });
  if (!seller || seller.role !== "SELLER" || !seller.active) {
    throw new ApiError(422, "Vendedor inválido");
  }

  return prisma.$transaction(async (tx) => {
    let customerId = contact.customerId;

    if (!customerId) {
      const customer = await tx.customer.create({
        data: { name: contact.name, phone: contact.phone },
      });
      customerId = customer.id;
      await tx.campaignContact.update({ where: { id: contactId }, data: { customerId } });
    }

    let opportunity = await tx.opportunity.findFirst({
      where: { customerId, status: "OPEN" },
    });
    if (!opportunity) {
      opportunity = await tx.opportunity.create({
        data: {
          customerId,
          sellerId: seller.id,
          originCampaignId: campaignId,
          source: "campaign",
          notes: input.notes,
        },
      });
    }

    const transfer = await tx.campaignTransfer.create({
      data: {
        contactId,
        sellerId: seller.id,
        agentId: user.id,
        dispositionId: contact.finalDispositionId,
        notes: input.notes,
        opportunityId: opportunity.id,
      },
    });

    await tx.campaignContact.update({
      where: { id: contactId },
      data: { transferredToSales: true, status: "CONVERTED" },
    });

    await recordAudit(tx, {
      userId: user.id,
      entityType: "CampaignContact",
      entityId: contactId,
      action: "TRANSFERRED_TO_SALES",
      metadata: { campaignId, sellerId: seller.id, opportunityId: opportunity.id },
    });

    return transfer;
  });
}
