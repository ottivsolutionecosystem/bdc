export const RANKING_SCORE_WEIGHTS = {
  treated: 1,
  successfulContacts: 2,
  interested: 3,
  transferred: 5,
  appointments: 10,
} as const;

export function rankingScore(input: {
  treated: number;
  successfulContacts: number;
  interested: number;
  transferred: number;
  appointments: number;
}): number {
  return (
    input.treated * RANKING_SCORE_WEIGHTS.treated +
    input.successfulContacts * RANKING_SCORE_WEIGHTS.successfulContacts +
    input.interested * RANKING_SCORE_WEIGHTS.interested +
    input.transferred * RANKING_SCORE_WEIGHTS.transferred +
    input.appointments * RANKING_SCORE_WEIGHTS.appointments
  );
}

export type RankingBoardAgent = {
  rank: number;
  agentId: string;
  agentName: string;
  assigned: number;
  treated: number;
  pending: number;
  attempts: number;
  successfulContacts: number;
  interested: number;
  appointments: number;
  transferred: number;
  treatmentRate: number;
  contactRate: number;
  score: number;
  attemptsToday: number;
  successfulContactsToday: number;
  treatedToday: number;
  interestedToday: number;
  transferredToday: number;
  appointmentsToday: number;
  scoreToday: number;
};

export type RankingBoardPayload = {
  campaign: { id: string; name: string; status: string };
  generatedAt: string;
  timezone: string;
  totals: {
    attemptsToday: number;
    successfulContactsToday: number;
    treatedToday: number;
    interestedToday: number;
    appointmentsToday: number;
    transferredToday: number;
    scoreToday: number;
    score: number;
  };
  agents: RankingBoardAgent[];
};
