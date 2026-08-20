import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-error";
import { requireSupervisorOrAdmin, type SessionUser } from "@/lib/permissions";
import { recordAudit } from "@/server/services/audit";
import type { UpdateContactFichaInput } from "@/schemas/customer";

export async function getContactFicha(campaignId: string, contactId: string) {
  const contact = await prisma.campaignContact.findUnique({
    where: { id: contactId },
    include: {
      customer: true,
      assignedAgent: { select: { id: true, name: true } },
      finalDisposition: { select: { id: true, label: true } },
      appointment: {
        select: {
          id: true,
          scheduledAt: true,
          status: true,
          notes: true,
          seller: { select: { name: true } },
        },
      },
      assignmentHistory: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          fromAgent: { select: { name: true } },
          toAgent: { select: { name: true } },
          changedBy: { select: { name: true } },
        },
      },
      transfers: {
        orderBy: { createdAt: "desc" },
        include: {
          seller: { select: { name: true } },
          agent: { select: { name: true } },
        },
      },
      attempts: {
        orderBy: { attemptNumber: "desc" },
        take: 10,
        include: {
          disposition: { select: { label: true } },
          agent: { select: { name: true } },
        },
      },
    },
  });

  if (!contact || contact.campaignId !== campaignId) {
    throw new ApiError(404, "Contato não encontrado nesta campanha");
  }

  return contact;
}

export async function updateContactFicha(
  user: SessionUser,
  campaignId: string,
  contactId: string,
  input: UpdateContactFichaInput
) {
  requireSupervisorOrAdmin(user);

  const contact = await prisma.campaignContact.findUnique({ where: { id: contactId } });
  if (!contact || contact.campaignId !== campaignId) {
    throw new ApiError(404, "Contato não encontrado nesta campanha");
  }

  const email = input.email === "" ? null : input.email;
  const document = input.document === "" ? null : input.document;

  return prisma.$transaction(async (tx) => {
    let customerId = contact.customerId;

    if (!customerId) {
      const customer = await tx.customer.create({
        data: {
          name: input.name ?? contact.name,
          phone: contact.phone,
          email: email ?? undefined,
          document: document ?? undefined,
        },
      });
      customerId = customer.id;
    } else {
      await tx.customer.update({
        where: { id: customerId },
        data: {
          name: input.name,
          email: email === undefined ? undefined : email,
          document: document === undefined ? undefined : document,
        },
      });
    }

    const updated = await tx.campaignContact.update({
      where: { id: contactId },
      data: {
        customerId,
        name: input.name,
        notes: input.notes === undefined ? undefined : input.notes,
      },
      include: { customer: true },
    });

    await recordAudit(tx, {
      userId: user.id,
      entityType: "CampaignContact",
      entityId: contactId,
      action: "FICHA_UPDATED",
      metadata: { campaignId },
    });

    return updated;
  });
}
