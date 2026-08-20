import { prisma } from "@/lib/prisma";
import { actionableContactsWhere } from "@/lib/contact-action";
import { startOfTodayInAppTz, APP_TIMEZONE } from "@/lib/datetime";
import { rankingScore, type RankingBoardAgent, type RankingBoardPayload } from "@/lib/ranking";

/**
 * Fórmulas de métricas (documentadas aqui para não ficarem implícitas no código):
 *
 * - Taxa de tratamento = tratados / base atribuída * 100
 * - Taxa de contato = contatos com sucesso (>=1 tentativa com `contacted=true`)
 *                      / contatos únicos com ao menos 1 tentativa * 100
 *   (mede alcance real da base, não volume de ligações — mais coerente que
 *   usar o total de tentativas como denominador)
 * - Taxa de interesse = interessados / contatos com sucesso * 100
 * - Taxa de agendamento = agendamentos / contatos com sucesso * 100
 * - Taxa de transferência = transferidos para vendas / contatos com sucesso * 100
 *
 * Todas as taxas retornam 0 quando o denominador é 0 (nunca dividem por zero).
 * "Interessado" = temperatura HOT ou WARM (mesma definição usada na fila da agente).
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
  const [total, treated, followUp, notReached, converted, interested, appointments, transferred] =
    await Promise.all([
      prisma.campaignContact.count({ where: { campaignId } }),
      prisma.campaignContact.count({ where: { campaignId, status: "TREATED" } }),
      prisma.campaignContact.count({ where: { campaignId, status: "FOLLOW_UP" } }),
      prisma.campaignContact.count({ where: { campaignId, status: "NOT_REACHED" } }),
      prisma.campaignContact.count({ where: { campaignId, status: "CONVERTED" } }),
      prisma.campaignContact.count({ where: { campaignId, temperature: { in: ["HOT", "WARM"] } } }),
      prisma.appointment.count({ where: { originCampaignContact: { campaignId } } }),
      prisma.campaignContact.count({ where: { campaignId, transferredToSales: true } }),
    ]);

  const pending = total - treated - followUp - notReached - converted;
  const completedCount = treated + followUp + notReached + converted;

  return {
    total,
    treated,
    pending: Math.max(pending, 0),
    followUp,
    notReached,
    converted,
    interested,
    appointments,
    transferred,
    completionPercent: pct(completedCount, total),
  };
}

export async function getAgentPerformance(campaignId: string) {
  const agents = await prisma.campaignAgent.findMany({
    where: { campaignId, active: true },
    include: { user: { select: { id: true, name: true } } },
  });

  const [assignedRows, treatedRows, attemptTotalRows, attemptedDistinctRows, contactedDistinctRows, interestedRows, appointmentRows, transferRows] =
    await Promise.all([
      prisma.campaignContact.groupBy({
        by: ["assignedAgentId"],
        where: { campaignId, assignedAgentId: { not: null } },
        _count: { _all: true },
      }),
      prisma.campaignContact.groupBy({
        by: ["assignedAgentId"],
        where: { campaignId, assignedAgentId: { not: null }, status: { in: ["TREATED", "CONVERTED", "NOT_REACHED"] } },
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
        where: { campaignId, assignedAgentId: { not: null }, temperature: { in: ["HOT", "WARM"] } },
        _count: { _all: true },
      }),
      prisma.appointment.findMany({
        where: { originCampaignContact: { campaignId } },
        select: { originCampaignContact: { select: { assignedAgentId: true } } },
      }),
      prisma.campaignContact.groupBy({
        by: ["assignedAgentId"],
        where: { campaignId, assignedAgentId: { not: null }, transferredToSales: true },
        _count: { _all: true },
      }),
    ]);

  const assignedMap = new Map(assignedRows.map((r) => [r.assignedAgentId as string, r._count._all]));
  const treatedMap = new Map(treatedRows.map((r) => [r.assignedAgentId as string, r._count._all]));
  const attemptTotalMap = new Map(attemptTotalRows.map((r) => [r.agentId, r._count._all]));
  const attemptedDistinctMap = countByKey(attemptedDistinctRows.map((r) => ({ key: r.agentId })));
  const contactedDistinctMap = countByKey(contactedDistinctRows.map((r) => ({ key: r.agentId })));
  const interestedMap = new Map(interestedRows.map((r) => [r.assignedAgentId as string, r._count._all]));
  const appointmentMap = countByKey(
    appointmentRows
      .filter((r) => r.originCampaignContact?.assignedAgentId)
      .map((r) => ({ key: r.originCampaignContact!.assignedAgentId as string }))
  );
  const transferMap = new Map(transferRows.map((r) => [r.assignedAgentId as string, r._count._all]));

  return agents.map((agent) => {
    const userId = agent.userId;
    const assigned = assignedMap.get(userId) ?? 0;
    const treated = treatedMap.get(userId) ?? 0;
    const attempts = attemptTotalMap.get(userId) ?? 0;
    const attemptedDistinct = attemptedDistinctMap.get(userId) ?? 0;
    const successfulContacts = contactedDistinctMap.get(userId) ?? 0;
    const interested = interestedMap.get(userId) ?? 0;
    const appointments = appointmentMap.get(userId) ?? 0;
    const transferred = transferMap.get(userId) ?? 0;

    return {
      agentId: userId,
      agentName: agent.user.name,
      assigned,
      treated,
      pending: Math.max(assigned - treated, 0),
      attempts,
      successfulContacts,
      interested,
      appointments,
      transferred,
      treatmentRate: pct(treated, assigned),
      contactRate: pct(successfulContacts, attemptedDistinct),
      interestRate: pct(interested, successfulContacts),
      appointmentRate: pct(appointments, successfulContacts),
      transferRate: pct(transferred, successfulContacts),
      score: rankingScore({ treated, successfulContacts, interested, transferred, appointments }),
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
  const [
    baseImported,
    attemptsMade,
    contactedRows,
    interested,
    appointments,
    transferred,
    negotiationOpen,
    won,
  ] = await Promise.all([
    prisma.campaignContact.count({ where: { campaignId } }),
    prisma.campaignContactAttempt.count({ where: { campaignId } }),
    prisma.campaignContactAttempt.groupBy({ by: ["contactId"], where: { campaignId, contacted: true } }),
    prisma.campaignContact.count({ where: { campaignId, temperature: { in: ["HOT", "WARM"] } } }),
    prisma.appointment.count({ where: { originCampaignContact: { campaignId } } }),
    prisma.campaignContact.count({ where: { campaignId, transferredToSales: true } }),
    prisma.opportunity.count({ where: { originCampaignId: campaignId, status: "OPEN" } }),
    prisma.opportunity.count({ where: { originCampaignId: campaignId, status: "WON" } }),
  ]);

  return [
    { stage: "Base importada", value: baseImported },
    { stage: "Tentativas realizadas", value: attemptsMade },
    { stage: "Clientes contatados", value: contactedRows.length },
    { stage: "Interessados", value: interested },
    { stage: "Agendamentos", value: appointments },
    { stage: "Transferidos para vendas", value: transferred },
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
    transferredTodayRows,
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
        status: { in: ["TREATED", "CONVERTED", "NOT_REACHED"] },
      },
      _count: { _all: true },
    }),
    prisma.campaignContact.groupBy({
      by: ["assignedAgentId"],
      where: {
        campaignId,
        assignedAgentId: { not: null },
        lastAttemptAt: { gte: todayStart },
        temperature: { in: ["HOT", "WARM"] },
      },
      _count: { _all: true },
    }),
    prisma.campaignTransfer.groupBy({
      by: ["agentId"],
      where: { createdAt: { gte: todayStart }, contact: { campaignId } },
      _count: { _all: true },
    }),
    prisma.appointment.findMany({
      where: { originCampaignContact: { campaignId }, createdAt: { gte: todayStart } },
      select: { originCampaignContact: { select: { assignedAgentId: true } } },
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
  const transferredTodayMap = new Map(transferredTodayRows.map((row) => [row.agentId, row._count._all]));
  const appointmentsTodayMap = countByKey(
    appointmentsTodayRows
      .filter((row) => row.originCampaignContact?.assignedAgentId)
      .map((row) => ({ key: row.originCampaignContact!.assignedAgentId as string }))
  );

  const agentsUnranked = performance.map((row) => {
    const attemptsToday = attemptsTodayMap.get(row.agentId) ?? 0;
    const successfulContactsToday = contactedTodayMap.get(row.agentId) ?? 0;
    const treatedToday = treatedTodayMap.get(row.agentId) ?? 0;
    const interestedToday = interestedTodayMap.get(row.agentId) ?? 0;
    const transferredToday = transferredTodayMap.get(row.agentId) ?? 0;
    const appointmentsToday = appointmentsTodayMap.get(row.agentId) ?? 0;
    return {
      agentId: row.agentId,
      agentName: row.agentName,
      assigned: row.assigned,
      treated: row.treated,
      pending: row.pending,
      attempts: row.attempts,
      successfulContacts: row.successfulContacts,
      interested: row.interested,
      appointments: row.appointments,
      transferred: row.transferred,
      treatmentRate: row.treatmentRate,
      contactRate: row.contactRate,
      score: row.score,
      attemptsToday,
      successfulContactsToday,
      treatedToday,
      interestedToday,
      transferredToday,
      appointmentsToday,
      scoreToday: rankingScore({
        treated: treatedToday,
        successfulContacts: successfulContactsToday,
        interested: interestedToday,
        transferred: transferredToday,
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
      transferredToday: agents.reduce((sum, row) => sum + row.transferredToday, 0),
      scoreToday: agents.reduce((sum, row) => sum + row.scoreToday, 0),
      score: agents.reduce((sum, row) => sum + row.score, 0),
    },
    agents,
  };
}
