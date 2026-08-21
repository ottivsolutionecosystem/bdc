import type { Prisma } from "@/generated/prisma/client";
import type { ContactStatus, ContactTemperature, DispositionCategory } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-error";
import { requireSupervisorOrAdmin, type SessionUser } from "@/lib/permissions";
import { startOfTodayInAppTz, startOfTomorrowInAppTz } from "@/lib/datetime";
import { recordAudit } from "@/server/services/audit";
import { assertCampaignOperable } from "@/lib/campaign-lifecycle";
import { isSellersNotifyDispositionCategory } from "@/lib/sellers-notify";
import { campaignHasSellersNotifyWebhook, notifySellersGroup } from "@/server/services/sellers-notify";
import {
  appointmentDispositionWhere,
  interestedDispositionWhere,
  pendingContactWhere,
  returnDispositionWhere,
  treatedDispositionWhere,
} from "@/lib/disposition-metrics";
import type { SubmitAttemptInput } from "@/schemas/attempt";

const LOCK_DURATION_MS = 10 * 60 * 1000; // 10 minutos: tempo de sobra para ligar e preencher o parecer
const MAX_ATTEMPTS = 3;
const queueContactInclude = {
  supervisorQueuedBy: { select: { name: true } },
  appointment: { select: { scheduledAt: true, notes: true, seller: { select: { name: true } } } },
  finalDisposition: { select: { category: true } },
} as const;

const ACTIVE_STATUSES: ContactStatus[] = ["UNTREATED", "ATTEMPTING", "FOLLOW_UP"];

function statusAfterDisposition(category: DispositionCategory, attemptNumber: number): ContactStatus {
  switch (category) {
    case "FOLLOW_UP":
      return "FOLLOW_UP";
    case "CONVERSION":
      return "CONVERTED";
    case "POSITIVE":
    case "NO_INTEREST":
      return "TREATED";
    case "NOT_REACHED":
      return attemptNumber >= MAX_ATTEMPTS ? "NOT_REACHED" : "ATTEMPTING";
  }
}

/**
 * Busca e reserva (lock temporário) o próximo contato da fila da agente,
 * priorizando retornos vencidos, depois retornos de hoje, depois novos
 * contatos/tentativas. Usa um `updateMany` condicional como mecanismo de
 * lock otimista: se duas requisições disputarem o mesmo contato, apenas uma
 * consegue reservá-lo (count === 1); a outra tenta o próximo candidato.
 */
export async function getNextQueueContact(user: SessionUser, campaignId: string) {
  await assertCampaignOperable(campaignId);
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    // 1. Já existe um contato reservado por mim (ex: recarreguei a página no meio de uma ligação)?
    const resumed = await tx.campaignContact.findFirst({
      where: {
        campaignId,
        assignedAgentId: user.id,
        lockedByUserId: user.id,
        lockExpiresAt: { gt: now },
      },
      include: queueContactInclude,
    });
    if (resumed) return resumed;

    const lockAvailable: Prisma.CampaignContactWhereInput = {
      OR: [{ lockedByUserId: null }, { lockExpiresAt: { lt: now } }],
    };

    for (let attempt = 0; attempt < 5; attempt += 1) {
      // 2. Retornos vencidos ou para agora, do mais atrasado para o mais recente.
      let candidate = await tx.campaignContact.findFirst({
        where: {
          campaignId,
          assignedAgentId: user.id,
          status: "FOLLOW_UP",
          nextContactAt: { lte: now },
          ...lockAvailable,
        },
        orderBy: [{ nextContactAt: "asc" }, { supervisorQueuedAt: { sort: "desc", nulls: "last" } }],
      });

      // 3. Novos contatos e reincidências, do mais antigo para o mais novo.
      if (!candidate) {
        candidate = await tx.campaignContact.findFirst({
          where: {
            campaignId,
            assignedAgentId: user.id,
            status: { in: ["UNTREATED", "ATTEMPTING"] },
            ...lockAvailable,
          },
          orderBy: [{ lastAttemptAt: { sort: "asc", nulls: "first" } }, { createdAt: "asc" }],
        });
      }

      if (!candidate) return null;

      const lockResult = await tx.campaignContact.updateMany({
        where: {
          id: candidate.id,
          OR: [{ lockedByUserId: null }, { lockExpiresAt: { lt: now } }],
        },
        data: {
          lockedByUserId: user.id,
          lockedAt: now,
          lockExpiresAt: new Date(now.getTime() + LOCK_DURATION_MS),
        },
      });

      if (lockResult.count === 1) {
        return tx.campaignContact.findUnique({ where: { id: candidate.id }, include: queueContactInclude });
      }
      // Perdeu a corrida para outra requisição — tenta o próximo candidato.
    }

    return null;
  });
}

export async function submitAttempt(
  user: SessionUser,
  campaignId: string,
  contactId: string,
  input: SubmitAttemptInput
) {
  await assertCampaignOperable(campaignId);

  const contact = await prisma.campaignContact.findUnique({ where: { id: contactId } });
  if (!contact || contact.campaignId !== campaignId) {
    throw new ApiError(404, "Contato não encontrado nesta campanha");
  }
  if (contact.assignedAgentId !== user.id) {
    throw new ApiError(403, "Este contato não está atribuído a você");
  }

  const disposition = await prisma.campaignDisposition.findUnique({ where: { id: input.dispositionId } });
  if (!disposition || !disposition.active || (disposition.campaignId && disposition.campaignId !== campaignId)) {
    throw new ApiError(422, "Parecer inválido para esta campanha");
  }
  if (disposition.requiresNextContact && !input.nextContactAt) {
    throw new ApiError(422, "Este parecer exige data e horário do próximo contato");
  }

  const attemptNumber = contact.attemptsCount + 1;
  const contacted = disposition.category !== "NOT_REACHED";
  const statusAfterAttempt = statusAfterDisposition(disposition.category, attemptNumber);
  const temperature: ContactTemperature = contact.temperatureManualOverride
    ? contact.temperature
    : disposition.defaultTemperature;

  const saved = await prisma.$transaction(async (tx) => {
    await tx.campaignContact.update({
      where: { id: contactId },
      data: {
        status: statusAfterAttempt,
        temperature,
        attemptsCount: attemptNumber,
        lastAttemptAt: new Date(),
        nextContactAt: disposition.requiresNextContact && input.nextContactAt ? new Date(input.nextContactAt) : null,
        finalDispositionId: disposition.id,
        notes: input.notes || null,
        interestedInEvent: input.qualification?.interestedInEvent ?? contact.interestedInEvent,
        stillOwnsLastVehicle: input.qualification?.stillOwnsLastVehicle ?? contact.stillOwnsLastVehicle,
        interestedInTrade: input.qualification?.interestedInTrade ?? contact.interestedInTrade,
        currentVehicle: input.qualification?.currentVehicle || contact.currentVehicle,
        purchaseTimeline: input.qualification?.purchaseTimeline ?? contact.purchaseTimeline,
        lockedByUserId: null,
        lockedAt: null,
        lockExpiresAt: null,
        supervisorQueuedAt: null,
        supervisorQueuedById: null,
        supervisorQueueKind: null,
        supervisorQueueNote: null,
      },
    });

    await tx.campaignContactAttempt.create({
      data: {
        campaignId,
        contactId,
        agentId: user.id,
        attemptNumber,
        dispositionId: disposition.id,
        statusAfterAttempt,
        notes: input.notes || null,
        contacted,
        nextContactAt: disposition.requiresNextContact && input.nextContactAt ? new Date(input.nextContactAt) : null,
      },
    });

    if (input.appointment) {
      let customerId = contact.customerId;
      if (!customerId) {
        const customer = await tx.customer.create({ data: { name: contact.name, phone: contact.phone } });
        customerId = customer.id;
        await tx.campaignContact.update({ where: { id: contactId }, data: { customerId } });
      }

      await tx.appointment.upsert({
        where: { originCampaignContactId: contactId },
        create: {
          customerId,
          sellerId: input.appointment.sellerId,
          scheduledAt: new Date(input.appointment.scheduledAt),
          notes: input.appointment.notes,
          originCampaignContactId: contactId,
        },
        update: {
          scheduledAt: new Date(input.appointment.scheduledAt),
          sellerId: input.appointment.sellerId,
          notes: input.appointment.notes,
          status: "SCHEDULED",
        },
      });
      await recordAudit(tx, {
        userId: user.id,
        entityType: "CampaignContact",
        entityId: contactId,
        action: "APPOINTMENT_SCHEDULED",
        metadata: { campaignId, scheduledAt: input.appointment.scheduledAt },
      });
    }

    await recordAudit(tx, {
      userId: user.id,
      entityType: "CampaignContact",
      entityId: contactId,
      action: "ATTEMPT_RECORDED",
      metadata: { campaignId, attemptNumber, dispositionId: disposition.id, statusAfterAttempt },
    });

    return tx.campaignContact.findUniqueOrThrow({
      where: { id: contactId },
      include: queueContactInclude,
    });
  });

  let contactAfterNotify = saved;
  let sellersNotify: { status: "skipped" | "sent" | "failed"; error?: string } = { status: "skipped" };

  if (isSellersNotifyDispositionCategory(disposition.category)) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { sellersNotifyWebhookUrl: true },
    });
    if (campaignHasSellersNotifyWebhook(campaign?.sellersNotifyWebhookUrl)) {
      try {
        contactAfterNotify = await notifySellersGroup(user, campaignId, contactId, {
          note: input.notes?.trim() || undefined,
        });
        sellersNotify = { status: "sent" };
      } catch (error) {
        sellersNotify = {
          status: "failed",
          error: error instanceof ApiError ? error.message : "Não foi possível avisar o grupo de vendedores.",
        };
      }
    }
  }

  return { contact: contactAfterNotify, sellersNotify };
}

export async function getAgentQueueStats(userId: string, campaignId: string) {
  const now = new Date();
  const todayStart = startOfTodayInAppTz(now);
  const todayEnd = startOfTomorrowInAppTz(now);

  const [assigned, treated, pending, followUp, interested, appointments, followUpsToday, overdueFollowUps, supervisorQueued] =
    await Promise.all([
    prisma.campaignContact.count({ where: { campaignId, assignedAgentId: userId } }),
    prisma.campaignContact.count({
      where: { campaignId, assignedAgentId: userId, finalDisposition: treatedDispositionWhere },
    }),
    prisma.campaignContact.count({
      where: { campaignId, assignedAgentId: userId, ...pendingContactWhere },
    }),
    prisma.campaignContact.count({
      where: { campaignId, assignedAgentId: userId, finalDisposition: returnDispositionWhere },
    }),
    prisma.campaignContact.count({
      where: { campaignId, assignedAgentId: userId, finalDisposition: interestedDispositionWhere },
    }),
    prisma.campaignContact.count({
      where: { campaignId, assignedAgentId: userId, finalDisposition: appointmentDispositionWhere },
    }),
    prisma.campaignContact.count({
      where: {
        campaignId,
        assignedAgentId: userId,
        status: "FOLLOW_UP",
        nextContactAt: { gte: todayStart, lt: todayEnd },
      },
    }),
    prisma.campaignContact.count({
      where: {
        campaignId,
        assignedAgentId: userId,
        status: "FOLLOW_UP",
        nextContactAt: { lte: now },
      },
    }),
    prisma.campaignContact.count({
      where: {
        campaignId,
        assignedAgentId: userId,
        supervisorQueuedAt: { not: null },
        status: { in: ACTIVE_STATUSES },
      },
    }),
  ]);

  return { assigned, treated, pending, followUp, interested, appointments, followUpsToday, overdueFollowUps, supervisorQueued };
}

export async function overrideContactTemperature(
  user: SessionUser,
  campaignId: string,
  contactId: string,
  temperature: ContactTemperature
) {
  requireSupervisorOrAdmin(user);

  const contact = await prisma.campaignContact.findUnique({ where: { id: contactId } });
  if (!contact || contact.campaignId !== campaignId) {
    throw new ApiError(404, "Contato não encontrado nesta campanha");
  }

  const updated = await prisma.campaignContact.update({
    where: { id: contactId },
    data: { temperature, temperatureManualOverride: true },
  });

  await recordAudit(prisma, {
    userId: user.id,
    entityType: "CampaignContact",
    entityId: contactId,
    action: "TEMPERATURE_OVERRIDDEN",
    metadata: { temperature },
  });

  return updated;
}
