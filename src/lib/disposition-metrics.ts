import type { Prisma } from "@/generated/prisma/client";

/** Parecer que conta em Agendamentos. */
export const APPOINTMENT_DISPOSITION_CODE = "visit_scheduled";

/** Parecer que conta em Não localizados. Os demais NOT_REACHED vão para Em retorno. */
export const NOT_LOCATED_DISPOSITION_CODE = "invalid_number";

export const DISPOSITION_METRIC_VALUES = [
  "interested",
  "appointments",
  "noInterest",
  "notReached",
  "followUp",
  "treated",
  "pending",
] as const;

export type DispositionMetric = (typeof DISPOSITION_METRIC_VALUES)[number];

export function parseDispositionMetric(value: string | null | undefined): DispositionMetric | undefined {
  if (!value) return undefined;
  return (DISPOSITION_METRIC_VALUES as readonly string[]).includes(value)
    ? (value as DispositionMetric)
    : undefined;
}

/** Positivos + Encaminhado para vendedor + Negociação aberta. */
export const interestedDispositionWhere = {
  OR: [
    { category: "POSITIVE" },
    { category: "CONVERSION", code: { not: APPOINTMENT_DISPOSITION_CODE } },
  ],
} satisfies Prisma.CampaignDispositionWhereInput;

export const appointmentDispositionWhere = {
  code: APPOINTMENT_DISPOSITION_CODE,
} satisfies Prisma.CampaignDispositionWhereInput;

export const noInterestDispositionWhere = {
  category: "NO_INTEREST",
} satisfies Prisma.CampaignDispositionWhereInput;

export const notLocatedDispositionWhere = {
  code: NOT_LOCATED_DISPOSITION_CODE,
} satisfies Prisma.CampaignDispositionWhereInput;

/** Follow-up + não localizado, exceto número inválido. */
export const returnDispositionWhere = {
  OR: [
    { category: "FOLLOW_UP" },
    { category: "NOT_REACHED", code: { not: NOT_LOCATED_DISPOSITION_CODE } },
  ],
} satisfies Prisma.CampaignDispositionWhereInput;

/** Todos os pareceres, menos Em retorno. */
export const treatedDispositionWhere = {
  OR: [
    { category: "POSITIVE" },
    { category: "CONVERSION" },
    { category: "NO_INTEREST" },
    { code: NOT_LOCATED_DISPOSITION_CODE },
  ],
} satisfies Prisma.CampaignDispositionWhereInput;

export const pendingContactWhere = {
  finalDispositionId: null,
} satisfies Prisma.CampaignContactWhereInput;

export function contactWhereForMetric(metric: DispositionMetric): Prisma.CampaignContactWhereInput {
  switch (metric) {
    case "interested":
      return { finalDisposition: interestedDispositionWhere };
    case "appointments":
      return { finalDisposition: appointmentDispositionWhere };
    case "noInterest":
      return { finalDisposition: noInterestDispositionWhere };
    case "notReached":
      return { finalDisposition: notLocatedDispositionWhere };
    case "followUp":
      return { finalDisposition: returnDispositionWhere };
    case "treated":
      return { finalDisposition: treatedDispositionWhere };
    case "pending":
      return pendingContactWhere;
  }
}
