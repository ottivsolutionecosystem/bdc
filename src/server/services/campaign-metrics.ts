import { prisma } from "@/lib/prisma";
import { actionableContactsWhere } from "@/lib/contact-action";
import { startOfTodayInAppTz, APP_TIMEZONE } from "@/lib/datetime";
import {
  appointmentDispositionWhere,
  interestedDispositionWhere,
  noInterestDispositionWhere,
  notLocatedDispositionWhere,
  pendingContactWhere,
  returnDispositionWhere,
  treatedDispositionWhere,
} from "@/lib/disposition-metrics";
import { rankingScore, type RankingBoardAgent, type RankingBoardPayload } from "@/lib/ranking";

/**
 * Fórmulas de métricas (último parecer do contato):
 *
 * - Interessados = Positivo + Encaminhado para vendedor + Negociação aberta
 * - Agendamentos = Visita agendada
 * - Sem interesse = categoria Sem interesse
 * - Não localizados = Número inválido
 * - Em retorno = follow-up + demais não localizados
 * - Tratados = todos os de cima, menos Em retorno
 * - Pendentes = sem parecer
 *
 * - Taxa de tratamento = tratados / base atribuída * 100
 * - Taxa de contato = contatos com sucesso / contatos únicos com ao menos 1 tentativa * 100
 * - Taxa de interesse = interessados / contatos com sucesso * 100
 * - Taxa de agendamento = agendamentos / contatos com sucesso * 100
 */

function pct(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function countByKey<T extends string>(rows: { key: T }[]): Map<T, number> {
  const map = new Map<T, number>();
  for (const row of rows) {
    map.set(row.key, (map.get(row.key) ?? 0) + 1);
  }
  return map;
}

export async function getCampaignOverview(campaignId: string) {
  const [total, treated, pending, followUp, interested, appointments, noInterest, notReached] =
    await Promise.all([
      prisma.campaignContact.count({ where: { campaignId } }),
      prisma.campaignContact.count({ where: { campaignId, finalDisposition: treatedDispositionWhere } }),
      prisma.campaignContact.count({ where: { campaignId, ...pendingContactWhere } }),
      prisma.campaignContact.count({ where: { campaignId, finalDisposition: returnDispositionWhere } }),
      prisma.campaignContact.count({ where: { campaignId, finalDisposition: interestedDispositionWhere } }),
      prisma.campaignContact.count({ where: { campaignId, finalDisposition: appointmentDispositionWhere } }),
      prisma.campaignContact.count({ where: { campaignId, finalDisposition: noInterestDispositionWhere } }),
      prisma.campaignContact.count({ where: { campaignId, finalDisposition: notLocatedDispositionWhere } }),
    ]);

  return {
    total,
    treated,
    pending,
    followUp,
    notReached,
    interested,
    appointments,
    noInterest,
    completionPercent: pct(treated + followUp, total),
  };
}

export async function getAgentPerformance(campaignId: string) {
  const agents = await prisma.campaignAgent.findMany({
    where: { campaignId, active: true },
    include: { user: { select: { id: true, name: true } } },
  });

  const [assignedRows, treatedRows, pendingRows, followUpRows, attemptTotalRows, attemptedDistinctRows, contactedDistinctRows, interestedRows, appointmentRows, noInterestRows] =
    await Promise.all([
      prisma.campaignContact.groupBy({
        by: ["assignedAgentId"],
        where: { campaignId, assignedAgentId: { not: null } },
        _count: { _all: true },
      }),
      prisma.campaignContact.groupBy({
        by: ["assignedAgentId"],
        where: { campaignId, assignedAgentId: { not: null }, finalDisposition: treatedDispositionWhere },
        _count: { _all: true },
      }),
      prisma.campaignContact.groupBy({
        by: ["assignedAgentId"],
        where: { campaignId, assignedAgentId: { not: null }, ...pendingContactWhere },
        _count: { _all: true },
      }),
      prisma.campaignContact.groupBy({
        by: ["assignedAgentId"],
        where: { campaignId, assignedAgentId: { not: null }, finalDisposition: returnDispositionWhere },
        _count: { _all: true },
      }),
      prisma.campaignContactAttempt.groupBy({
        by: ["agentId"],
        where: { campaignId },
        _count: { _all: true },
      }),
      prisma.campaignContactAttempt.groupBy({
        by: ["agentId", "contactId"],
        where: { campaignId },
      }),
      prisma.campaignContactAttempt.groupBy({
        by: ["agentId", "contactId"],
        where: { campaignId, contacted: true },
      }),
      prisma.campaignContact.groupBy({
        by: ["assignedAgentId"],
        where: { campaignId, assignedAgentId: { not: null }, finalDisposition: interestedDispositionWhere },
        _count: { _all: true },
      }),
      prisma.campaignContact.groupBy({
        by: ["assignedAgentId"],
        where: { campaignId, assignedAgentId: { not: null }, finalDisposition: appointmentDispositionWhere },
        _count: { _all: true },
      }),
      prisma.campaignContact.groupBy({
        by: ["assignedAgentId"],
        where: { campaignId, assignedAgentId: { not: null }, finalDisposition: noInterestDispositionWhere },
        _count: { _all: true },
      }),
    ]);

  const assignedMap = new Map(assignedRows.map((r) => [r.assignedAgentId as string, r._count._all]));
  const treatedMap = new Map(treatedRows.map((r) => [r.assignedAgentId as string, r._count._all]));
  const pendingMap = new Map(pendingRows.map((r) => [r.assignedAgentId as string, r._count._all]));
  const followUpMap = new Map(followUpRows.map((r) => [r.assignedAgentId as string, r._count._all]));
  const attemptTotalMap = new Map(attemptTotalRows.map((r) => [r.agentId, r._count._all]));
  const attemptedDistinctMap = countByKey(attemptedDistinctRows.map((r) => ({ key: r.agentId })));
  const contactedDistinctMap = countByKey(contactedDistinctRows.map((r) => ({ key: r.agentId })));
  const interestedMap = new Map(interestedRows.map((r) => [r.assignedAgentId as string, r._count._all]));
  const appointmentMap = new Map(appointmentRows.map((r) => [r.assignedAgentId as string, r._count._all]));
  const noInterestMap = new Map(noInterestRows.map((r) => [r.assignedAgentId as string, r._count._all]));

  return agents.map((agent) => {
    const userId = agent.userId;
    const assigned = assignedMap.get(userId) ?? 0;
    const treated = treatedMap.get(userId) ?? 0;
    const pending = pendingMap.get(userId) ?? 0;
    const followUp = followUpMap.get(userId) ?? 0;
    const attempts = attemptTotalMap.get(userId) ?? 0;
    const attemptedDistinct = attemptedDistinctMap.get(userId) ?? 0;
    const successfulContacts = contactedDistinctMap.get(userId) ?? 0;
    const interested = interestedMap.get(userId) ?? 0;
    const appointments = appointmentMap.get(userId) ?? 0;
    const noInterest = noInterestMap.get(userId) ?? 0;

    return {
      agentId: userId,
      agentName: agent.user.name,
      assigned,
      treated,
      pending,
      followUp,
      attempts,
      successfulContacts,
      interested,
      appointments,
      noInterest,
      treatmentRate: pct(treated, assigned),
      contactRate: pct(successfulContacts, attemptedDistinct),
      interestRate: pct(interested, successfulContacts),
      appointmentRate: pct(appointments, successfulContacts),
      score: rankingScore({ treated, successfulContacts, interested, appointments }),
    };
  });
}

export async function getDispositionBreakdown(campaignId: string) {
  const rows = await prisma.campaignContact.groupBy({
    by: ["finalDispositionId"],
    where: { campaignId, finalDispositionId: { not: null } },
    _count: { _all: true },
  });

  const dispositionIds = rows.map((r) => r.finalDispositionId).filter((id): id is string => !!id);
  const dispositions = await prisma.campaignDisposition.findMany({ where: { id: { in: dispositionIds } } });
  const dispositionById = new Map(dispositions.map((d) => [d.id, d]));

  const total = rows.reduce((sum, r) => sum + r._count._all, 0);

  return rows
    .map((r) => {
      const disposition = dispositionById.get(r.finalDispositionId as string);
      return {
        dispositionId: r.finalDispositionId as string,
        label: disposition?.label ?? "Desconhecido",
        category: disposition?.category ?? "NOT_REACHED",
        count: r._count._all,
        percent: pct(r._count._all, total),
      };
    })
    .sort((a, b) => b.count - a.count);
}

export async function getCampaignFunnel(campaignId: string) {
  const [baseImported, attemptsMade, contactedRows, interested, appointments, noInterest, negotiationOpen, won] =
    await Promise.all([
      prisma.campaignContact.count({ where: { campaignId } }),
      prisma.campaignContactAttempt.count({ where: { campaignId } }),
      prisma.campaignContactAttempt.groupBy({ by: ["contactId"], where: { campaignId, contacted: true } }),
      prisma.campaignContact.count({ where: { campaignId, finalDisposition: interestedDispositionWhere } }),
      prisma.campaignContact.count({ where: { campaignId, finalDisposition: appointmentDispositionWhere } }),
      prisma.campaignContact.count({ where: { campaignId, finalDisposition: noInterestDispositionWhere } }),
      prisma.opportunity.count({ where: { originCampaignId: campaignId, status: "OPEN" } }),
      prisma.opportunity.count({ where: { originCampaignId: campaignId, status: "WON" } }),
    ]);

  return [
    { stage: "Base importada", value: baseImported },
    { stage: "Tentativas realizadas", value: attemptsMade },
    { stage: "Clientes contatados", value: contactedRows.length },
    { stage: "Interessados", value: interested },
    { stage: "Agendamentos", value: appointments },
    { stage: "Sem interesse", value: noInterest },
    { stage: "Negociação", value: negotiationOpen },
    { stage: "Venda", value: won },
  ];
}

export async function getOverdueFollowUpsCount(campaignId: string) {
  return prisma.campaignContact.count({
    where: { campaignId, status: "FOLLOW_UP", nextContactAt: { lte: new Date() } },
  });
}

export async function getNeedsActionCount(campaignId: string) {
  return prisma.campaignContact.count({ where: actionableContactsWhere(campaignId) });
}

export async function getCampaignRanking(campaignId: string): Promise<RankingBoardPayload> {
  const todayStart = startOfTodayInAppTz();
  const [
    campaign,
    performance,
    attemptsTodayRows,
    contactedTodayRows,
    treatedTodayRows,
    interestedTodayRows,
    appointmentsTodayRows,
  ] = await Promise.all([
    prisma.campaign.findUniqueOrThrow({
      where: { id: campaignId },
      select: { id: true, name: true, status: true },
    }),
    getAgentPerformance(campaignId),
    prisma.campaignContactAttempt.groupBy({
      by: ["agentId"],
      where: { campaignId, createdAt: { gte: todayStart } },
      _count: { _all: true },
    }),
    prisma.campaignContactAttempt.groupBy({
      by: ["agentId", "contactId"],
      where: { campaignId, contacted: true, createdAt: { gte: todayStart } },
    }),
    prisma.campaignContact.groupBy({
      by: ["assignedAgentId"],
      where: {
        campaignId,
        assignedAgentId: { not: null },
        lastAttemptAt: { gte: todayStart },
        finalDisposition: treatedDispositionWhere,
      },
      _count: { _all: true },
    }),
    prisma.campaignContact.groupBy({
      by: ["assignedAgentId"],
      where: {
        campaignId,
        assignedAgentId: { not: null },
        lastAttemptAt: { gte: todayStart },
        finalDisposition: interestedDispositionWhere,
      },
      _count: { _all: true },
    }),
    prisma.campaignContact.groupBy({
      by: ["assignedAgentId"],
      where: {
        campaignId,
        assignedAgentId: { not: null },
        lastAttemptAt: { gte: todayStart },
        finalDisposition: appointmentDispositionWhere,
      },
      _count: { _all: true },
    }),
  ]);

  const attemptsTodayMap = new Map(attemptsTodayRows.map((row) => [row.agentId, row._count._all]));
  const contactedTodayMap = countByKey(contactedTodayRows.map((row) => ({ key: row.agentId })));
  const treatedTodayMap = new Map(
    treatedTodayRows.map((row) => [row.assignedAgentId as string, row._count._all])
  );
  const interestedTodayMap = new Map(
    interestedTodayRows.map((row) => [row.assignedAgentId as string, row._count._all])
  );
  const appointmentsTodayMap = new Map(
    appointmentsTodayRows.map((row) => [row.assignedAgentId as string, row._count._all])
  );

  const agentsUnranked = performance.map((row) => {
    const attemptsToday = attemptsTodayMap.get(row.agentId) ?? 0;
    const successfulContactsToday = contactedTodayMap.get(row.agentId) ?? 0;
    const treatedToday = treatedTodayMap.get(row.agentId) ?? 0;
    const interestedToday = interestedTodayMap.get(row.agentId) ?? 0;
    const appointmentsToday = appointmentsTodayMap.get(row.agentId) ?? 0;
    return {
      agentId: row.agentId,
      agentName: row.agentName,
      assigned: row.assigned,
      treated: row.treated,
      pending: row.pending,
      followUp: row.followUp,
      attempts: row.attempts,
      successfulContacts: row.successfulContacts,
      interested: row.interested,
      appointments: row.appointments,
      noInterest: row.noInterest,
      treatmentRate: row.treatmentRate,
      contactRate: row.contactRate,
      score: row.score,
      attemptsToday,
      successfulContactsToday,
      treatedToday,
      interestedToday,
      appointmentsToday,
      scoreToday: rankingScore({
        treated: treatedToday,
        successfulContacts: successfulContactsToday,
        interested: interestedToday,
        appointments: appointmentsToday,
      }),
    };
  });

  const agents: RankingBoardAgent[] = agentsUnranked
    .sort((a, b) => b.score - a.score || b.scoreToday - a.scoreToday || a.agentName.localeCompare(b.agentName, "pt-BR"))
    .map((row, index) => ({ ...row, rank: index + 1 }));

  return {
    campaign,
    generatedAt: new Date().toISOString(),
    timezone: APP_TIMEZONE,
    totals: {
      attemptsToday: agents.reduce((sum, row) => sum + row.attemptsToday, 0),
      successfulContactsToday: agents.reduce((sum, row) => sum + row.successfulContactsToday, 0),
      treatedToday: agents.reduce((sum, row) => sum + row.treatedToday, 0),
      interestedToday: agents.reduce((sum, row) => sum + row.interestedToday, 0),
      appointmentsToday: agents.reduce((sum, row) => sum + row.appointmentsToday, 0),
      scoreToday: agents.reduce((sum, row) => sum + row.scoreToday, 0),
      score: agents.reduce((sum, row) => sum + row.score, 0),
    },
    agents,
  };
}
