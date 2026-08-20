import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type { AssignmentChangeReason } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-error";
import { requireSupervisorOrAdmin, type SessionUser } from "@/lib/permissions";
import { chunkArray } from "@/lib/array";
import { recordAudit } from "@/server/services/audit";
import { getCampaignOrThrow } from "@/server/services/campaign";
import { assertCampaignAcceptsSetup } from "@/lib/campaign-lifecycle";

type PrismaTx = PrismaClient | Prisma.TransactionClient;

const UPDATE_CHUNK_SIZE = 500;

/**
 * Distribui uma lista de contatos entre as agentes ativas da campanha usando
 * round robin, continuando a partir do ponteiro persistido em
 * CampaignDistributionState (nunca reinicia do primeiro agente, mesmo em
 * importações/redistribuições feitas em momentos diferentes).
 *
 * `contactIds` deve estar em uma ordem estável (ex: ordem de criação/id) para
 * que o rodízio seja determinístico. Contatos ficam sem agente atribuído
 * quando não há nenhuma agente ativa na campanha.
 */
export async function distributeContacts(
  tx: PrismaTx,
  params: {
    campaignId: string;
    contactIds: string[];
    reason: AssignmentChangeReason;
    changedById: string;
    /** fromAgentId de cada contato, quando aplicável (redistribuição/remoção). */
    fromAgentIdByContactId?: Map<string, string | null>;
  }
): Promise<void> {
  const { campaignId, contactIds, reason, changedById, fromAgentIdByContactId } = params;
  if (contactIds.length === 0) return;

  const activeAgents = await tx.campaignAgent.findMany({
    where: { campaignId, active: true },
    orderBy: { id: "asc" },
    select: { id: true, userId: true },
  });

  if (activeAgents.length === 0) {
    // Nenhuma agente ativa: contatos ficam sem atribuição até haver alguma.
    for (const chunk of chunkArray(contactIds, UPDATE_CHUNK_SIZE)) {
      await tx.campaignContact.updateMany({
        where: { id: { in: chunk } },
        data: { assignedAgentId: null },
      });
    }
    return;
  }

  const state = await tx.campaignDistributionState.upsert({
    where: { campaignId },
    create: { campaignId },
    update: {},
  });

  let startIndex = 0;
  if (state.lastAgentId) {
    const lastIndex = activeAgents.findIndex((agent) => agent.userId === state.lastAgentId);
    startIndex = lastIndex === -1 ? 0 : (lastIndex + 1) % activeAgents.length;
  }

  const buckets = new Map<string, string[]>();
  contactIds.forEach((contactId, index) => {
    const agent = activeAgents[(startIndex + index) % activeAgents.length];
    const bucket = buckets.get(agent.userId) ?? [];
    bucket.push(contactId);
    buckets.set(agent.userId, bucket);
  });

  const historyRows: {
    contactId: string;
    fromAgentId: string | null;
    toAgentId: string;
    reason: AssignmentChangeReason;
    changedById: string;
  }[] = [];

  for (const [userId, ids] of buckets) {
    for (const chunk of chunkArray(ids, UPDATE_CHUNK_SIZE)) {
      await tx.campaignContact.updateMany({
        where: { id: { in: chunk } },
        data: { assignedAgentId: userId },
      });
    }
    await tx.campaignAgent.updateMany({
      where: { campaignId, userId },
      data: { assignedCount: { increment: ids.length } },
    });
    for (const contactId of ids) {
      historyRows.push({
        contactId,
        fromAgentId: fromAgentIdByContactId?.get(contactId) ?? null,
        toAgentId: userId,
        reason,
        changedById,
      });
    }
  }

  for (const chunk of chunkArray(historyRows, UPDATE_CHUNK_SIZE)) {
    await tx.campaignContactAssignmentHistory.createMany({ data: chunk });
  }

  const lastAgentUserId = activeAgents[(startIndex + contactIds.length - 1) % activeAgents.length].userId;
  await tx.campaignDistributionState.update({
    where: { campaignId },
    data: { lastAgentId: lastAgentUserId },
  });
}

/**
 * Redistribui toda a base da campanha do zero (round robin a partir do
 * primeiro agente ativo), preservando o histórico de tentativas — apenas a
 * atribuição (assignedAgentId) muda. Usado pelo supervisor para "redistribuir
 * toda a base".
 */
export async function redistributeAllContacts(user: SessionUser, campaignId: string): Promise<{ redistributed: number }> {
  requireSupervisorOrAdmin(user);
  const campaign = await getCampaignOrThrow(campaignId);
  assertCampaignAcceptsSetup(campaign.status);

  return prisma.$transaction(
    async (tx) => {
      const contacts = await tx.campaignContact.findMany({
        where: { campaignId },
        orderBy: { createdAt: "asc" },
        select: { id: true, assignedAgentId: true },
      });
      if (contacts.length === 0) return { redistributed: 0 };

      await tx.campaignDistributionState.upsert({
        where: { campaignId },
        create: { campaignId, lastAgentId: null },
        update: { lastAgentId: null },
      });
      await tx.campaignAgent.updateMany({ where: { campaignId }, data: { assignedCount: 0 } });

      const fromAgentIdByContactId = new Map(contacts.map((c) => [c.id, c.assignedAgentId]));

      await distributeContacts(tx, {
        campaignId,
        contactIds: contacts.map((c) => c.id),
        reason: "REDISTRIBUTE",
        changedById: user.id,
        fromAgentIdByContactId,
      });

      await recordAudit(tx, {
        userId: user.id,
        entityType: "Campaign",
        entityId: campaignId,
        action: "REDISTRIBUTED_ALL",
        metadata: { contactsCount: contacts.length },
      });

      return { redistributed: contacts.length };
    },
    { timeout: 60_000 }
  );
}

/**
 * Move um único contato para outra agente manualmente (ação do supervisor).
 */
export async function moveContactToAgent(
  user: SessionUser,
  campaignId: string,
  contactId: string,
  toUserId: string
): Promise<void> {
  requireSupervisorOrAdmin(user);
  const campaign = await getCampaignOrThrow(campaignId);
  assertCampaignAcceptsSetup(campaign.status);

  await prisma.$transaction(async (tx) => {
    const contact = await tx.campaignContact.findUnique({ where: { id: contactId } });
    if (!contact || contact.campaignId !== campaignId) {
      throw new ApiError(404, "Contato não encontrado nesta campanha");
    }
    const targetMembership = await tx.campaignAgent.findUnique({
      where: { campaignId_userId: { campaignId, userId: toUserId } },
    });
    if (!targetMembership?.active) {
      throw new ApiError(422, "A agente de destino não está ativa nesta campanha");
    }

    const reopenNotReached = contact.status === "NOT_REACHED";
    await tx.campaignContact.update({
      where: { id: contactId },
      data: {
        assignedAgentId: toUserId,
        ...(reopenNotReached
          ? {
              status: "FOLLOW_UP" as const,
              nextContactAt: new Date(),
              lockedByUserId: null,
              lockedAt: null,
              lockExpiresAt: null,
              supervisorQueuedAt: new Date(),
              supervisorQueuedById: user.id,
              supervisorQueueKind: "REQUEUED",
              supervisorQueueNote: null,
            }
          : {}),
      },
    });

    if (contact.assignedAgentId) {
      await tx.campaignAgent.updateMany({
        where: { campaignId, userId: contact.assignedAgentId },
        data: { assignedCount: { decrement: 1 } },
      });
    }
    await tx.campaignAgent.updateMany({
      where: { campaignId, userId: toUserId },
      data: { assignedCount: { increment: 1 } },
    });

    await tx.campaignContactAssignmentHistory.create({
      data: {
        contactId,
        fromAgentId: contact.assignedAgentId,
        toAgentId: toUserId,
        reason: "MANUAL",
        changedById: user.id,
      },
    });

    await recordAudit(tx, {
      userId: user.id,
      entityType: "CampaignContact",
      entityId: contactId,
      action: "MOVED_AGENT",
      metadata: { campaignId, fromAgentId: contact.assignedAgentId, toAgentId: toUserId },
    });
  });
}

/**
 * Remove uma agente da campanha (desativa o vínculo) e redistribui os
 * contatos dela entre as demais agentes ativas.
 */
export async function removeCampaignAgentAndRedistribute(
  user: SessionUser,
  campaignId: string,
  campaignAgentId: string
): Promise<{ redistributed: number }> {
  requireSupervisorOrAdmin(user);
  const campaign = await getCampaignOrThrow(campaignId);
  assertCampaignAcceptsSetup(campaign.status);

  return prisma.$transaction(
    async (tx) => {
      const membership = await tx.campaignAgent.findUnique({ where: { id: campaignAgentId } });
      if (!membership || membership.campaignId !== campaignId) {
        throw new ApiError(404, "Vínculo de agente não encontrado nesta campanha");
      }

      await tx.campaignAgent.update({ where: { id: campaignAgentId }, data: { active: false, assignedCount: 0 } });

      const orphanContacts = await tx.campaignContact.findMany({
        where: { campaignId, assignedAgentId: membership.userId, status: { notIn: ["TREATED", "CONVERTED", "NOT_REACHED"] } },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });

      const fromAgentIdByContactId = new Map(orphanContacts.map((c) => [c.id, membership.userId as string | null]));

      await distributeContacts(tx, {
        campaignId,
        contactIds: orphanContacts.map((c) => c.id),
        reason: "AGENT_REMOVED",
        changedById: user.id,
        fromAgentIdByContactId,
      });

      await recordAudit(tx, {
        userId: user.id,
        entityType: "CampaignAgent",
        entityId: campaignAgentId,
        action: "AGENT_REMOVED",
        metadata: { campaignId, redistributedContacts: orphanContacts.length },
      });

      return { redistributed: orphanContacts.length };
    },
    { timeout: 60_000 }
  );
}
