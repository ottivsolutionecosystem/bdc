export const RANKING_SCORE_WEIGHTS = {
  treated: 1,
  successfulContacts: 2,
  interested: 3,
  appointments: 10,
} as const;

export function rankingScore(input: {
  treated: number;
  successfulContacts: number;
  interested: number;
  appointments: number;
}): number {
  return (
    input.treated * RANKING_SCORE_WEIGHTS.treated +
    input.successfulContacts * RANKING_SCORE_WEIGHTS.successfulContacts +
    input.interested * RANKING_SCORE_WEIGHTS.interested +
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
  followUp: number;
  attempts: number;
  successfulContacts: number;
  interested: number;
  appointments: number;
  noInterest: number;
  treatmentRate: number;
  contactRate: number;
  score: number;
  attemptsToday: number;
  successfulContactsToday: number;
  treatedToday: number;
  interestedToday: number;
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
    scoreToday: number;
    score: number;
  };
  agents: RankingBoardAgent[];
};
