import type { Prisma } from "@/generated/prisma/client";
import type { ContactStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-error";
import { requireSupervisorOrAdmin, type SessionUser } from "@/lib/permissions";
import { recordAudit } from "@/server/services/audit";
import { getCampaignOrThrow } from "@/server/services/campaign";
import { assertCampaignAcceptsSetup } from "@/lib/campaign-lifecycle";
import { CORRECTABLE_STATUSES, REOPENABLE_STATUSES, type SupervisorQueueKind } from "@/lib/contact-action";
import { chunkArray } from "@/lib/array";

const UPDATE_CHUNK = 200;

export function supervisorQueueUpdate(params: {
  nextContactAt: Date;
  kind: SupervisorQueueKind;
  userId: string;
  note?: string | null;
}): Prisma.CampaignContactUncheckedUpdateManyInput {
  return {
    status: "FOLLOW_UP",
    nextContactAt: params.nextContactAt,
    finalDispositionId: null,
    attemptsCount: 0,
    temperature: "COLD",
    temperatureManualOverride: false,
    transferredToSales: false,
    lockedByUserId: null,
    lockedAt: null,
    lockExpiresAt: null,
    supervisorQueuedAt: new Date(),
    supervisorQueuedById: params.userId,
    supervisorQueueKind: params.kind,
    supervisorQueueNote: params.note?.trim() || null,
  };
}

async function loadEligibleContacts(campaignId: string, contactIds: string[]) {
  const contacts = await prisma.campaignContact.findMany({
    where: { campaignId, id: { in: contactIds }, status: { in: REOPENABLE_STATUSES } },
    select: { id: true, assignedAgentId: true, status: true },
  });
  if (contacts.length === 0) {
    throw new ApiError(422, "Nenhum desses contatos pode voltar para a fila.");
  }
  return contacts;
}

/**
 * Devolve os leads à fila da mesma agente (ou sem agente, se ainda não tiverem).
 * Status vira Retorno com data agora — a operação puxa primeiro os vencidos.
 */
export async function reopenContactsToSameQueue(
  user: SessionUser,
  campaignId: string,
  contactIds: string[],
  options?: { nextContactAt?: Date; note?: string }
): Promise<{ reopened: number }> {
  requireSupervisorOrAdmin(user);
  const campaign = await getCampaignOrThrow(campaignId);
  assertCampaignAcceptsSetup(campaign.status);

  const contacts = await loadEligibleContacts(campaignId, contactIds);
  const ids = contacts.map((contact) => contact.id);
  const when = options?.nextContactAt ?? new Date();

  await prisma.campaignContact.updateMany({
    where: { id: { in: ids } },
    data: supervisorQueueUpdate({
      nextContactAt: when,
      kind: "SAME_QUEUE",
      userId: user.id,
      note: options?.note,
    }),
  });

  await recordAudit(prisma, {
    userId: user.id,
    entityType: "Campaign",
    entityId: campaignId,
    action: "CONTACTS_REOPENED",
    metadata: { contactIds: ids, nextContactAt: when.toISOString(), note: options?.note ?? null },
  });

  return { reopened: ids.length };
}

/**
 * Recoloca os leads na fila de outra agente (escolhida ou rodízio) e reabre
 * para a operação. Se houver mais de uma agente, o rodízio evita devolver
 * o lead para quem já estava com ele.
 */
export async function requeueContactsToOtherAgents(
  user: SessionUser,
  campaignId: string,
  contactIds: string[],
  options?: { toUserId?: string; nextContactAt?: Date; note?: string }
): Promise<{ requeued: number }> {
  requireSupervisorOrAdmin(user);
  const campaign = await getCampaignOrThrow(campaignId);
  assertCampaignAcceptsSetup(campaign.status);

  const contacts = await loadEligibleContacts(campaignId, contactIds);
  const activeAgents = await prisma.campaignAgent.findMany({
    where: { campaignId, active: true },
    orderBy: { id: "asc" },
    select: { userId: true },
  });
  if (activeAgents.length === 0) {
    throw new ApiError(422, "Vincule pelo menos uma agente ativa para redistribuir.");
  }

  const toUserId = options?.toUserId;
  if (toUserId) {
    const target = activeAgents.find((agent) => agent.userId === toUserId);
    if (!target) {
      throw new ApiError(422, "A agente de destino não está ativa nesta campanha");
    }
  }

  const when = options?.nextContactAt ?? new Date();
  const assignments = new Map<string, string[]>();
  const toAgentByContact = new Map<string, string>();
  let cursor = 0;

  for (const contact of contacts) {
    let nextAgentId = toUserId ?? null;
    if (!nextAgentId) {
      const others = activeAgents.filter((agent) => agent.userId !== contact.assignedAgentId);
      const pool = others.length > 0 ? others : activeAgents;
      nextAgentId = pool[cursor % pool.length].userId;
      cursor += 1;
    }

    const bucket = assignments.get(nextAgentId) ?? [];
    bucket.push(contact.id);
    assignments.set(nextAgentId, bucket);
    toAgentByContact.set(contact.id, nextAgentId);
  }

  await prisma.$transaction(async (tx) => {
    for (const [agentId, ids] of assignments) {
      for (const chunk of chunkArray(ids, UPDATE_CHUNK)) {
        await tx.campaignContact.updateMany({
          where: { id: { in: chunk } },
          data: {
            ...supervisorQueueUpdate({
              nextContactAt: when,
              kind: "REQUEUED",
              userId: user.id,
              note: options?.note,
            }),
            assignedAgentId: agentId,
          },
        });
      }
    }

    const delta = new Map<string, number>();
    for (const contact of contacts) {
      if (contact.assignedAgentId) {
        delta.set(contact.assignedAgentId, (delta.get(contact.assignedAgentId) ?? 0) - 1);
      }
    }
    for (const [agentId, ids] of assignments) {
      delta.set(agentId, (delta.get(agentId) ?? 0) + ids.length);
    }
    for (const [agentId, count] of delta) {
      if (count === 0) continue;
      await tx.campaignAgent.updateMany({
        where: { campaignId, userId: agentId },
        data: { assignedCount: { increment: count } },
      });
    }

    await tx.campaignContactAssignmentHistory.createMany({
      data: contacts.map((contact) => ({
        contactId: contact.id,
        fromAgentId: contact.assignedAgentId,
        toAgentId: toAgentByContact.get(contact.id)!,
        reason: "REDISTRIBUTE" as const,
        changedById: user.id,
      })),
    });

    await recordAudit(tx, {
      userId: user.id,
      entityType: "Campaign",
      entityId: campaignId,
      action: "CONTACTS_REQUEUED",
      metadata: {
        contactIds: contacts.map((contact) => contact.id),
        toUserId: toUserId ?? null,
        note: options?.note ?? null,
      },
    });
  });

  return { requeued: contacts.length };
}

function statusAfterCorrectedDisposition(category: string): ContactStatus {
  switch (category) {
    case "CONVERSION":
      return "CONVERTED";
    case "NOT_REACHED":
      return "NOT_REACHED";
    case "POSITIVE":
    case "NO_INTEREST":
      return "TREATED";
    default:
      return "TREATED";
  }
}

/** Troca o parecer sem devolver o lead à fila. Follow-up não entra: isso é voltar à fila. */
export async function correctContactDisposition(
  user: SessionUser,
  campaignId: string,
  contactId: string,
  dispositionId: string
) {
  requireSupervisorOrAdmin(user);
  const campaign = await getCampaignOrThrow(campaignId);
  assertCampaignAcceptsSetup(campaign.status);

  const contact = await prisma.campaignContact.findUnique({ where: { id: contactId } });
  if (!contact || contact.campaignId !== campaignId) {
    throw new ApiError(404, "Contato não encontrado nesta campanha");
  }
  if (!CORRECTABLE_STATUSES.includes(contact.status)) {
    throw new ApiError(422, "Só é possível corrigir o parecer de um lead encerrado.");
  }

  const disposition = await prisma.campaignDisposition.findUnique({ where: { id: dispositionId } });
  if (!disposition || !disposition.active || (disposition.campaignId && disposition.campaignId !== campaignId)) {
    throw new ApiError(422, "Parecer inválido para esta campanha");
  }
  if (disposition.category === "FOLLOW_UP") {
    throw new ApiError(422, "Para retorno, use voltar à fila. O parecer é zerado.");
  }

  const status = statusAfterCorrectedDisposition(disposition.category);
  const temperature = contact.temperatureManualOverride ? contact.temperature : disposition.defaultTemperature;

  const updated = await prisma.campaignContact.update({
    where: { id: contactId },
    data: {
      finalDispositionId: disposition.id,
      status,
      temperature,
      transferredToSales: false,
      lockedByUserId: null,
      lockedAt: null,
      lockExpiresAt: null,
    },
    include: {
      assignedAgent: { select: { id: true, name: true } },
      finalDisposition: { select: { id: true, label: true } },
      appointment: { select: { id: true, scheduledAt: true, seller: { select: { name: true } } } },
    },
  });

  await recordAudit(prisma, {
    userId: user.id,
    entityType: "CampaignContact",
    entityId: contactId,
    action: "CONTACT_DISPOSITION_CORRECTED",
    metadata: { campaignId, dispositionId: disposition.id, previousDispositionId: contact.finalDispositionId },
  });

  return updated;
}
