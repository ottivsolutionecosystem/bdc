import type { Prisma } from "@/generated/prisma/client";
import type { ContactStatus } from "@/generated/prisma/enums";

export type ContactListGroup = "untreated" | "treated" | "action";

/** Status que ainda não têm desfecho (quer / não quer / convertido). */
export const REOPENABLE_STATUSES: ContactStatus[] = [
  "UNTREATED",
  "ATTEMPTING",
  "FOLLOW_UP",
  "NOT_REACHED",
];

export const CLOSED_STATUSES: ContactStatus[] = ["TREATED", "CONVERTED"];

/**
 * Leads que o supervisor precisa decidir: devolver à mesma fila ou
 * redistribuir. Retornos futuros já estão na fila da agente e não entram aqui.
 */
export function actionableContactsWhere(
  campaignId: string,
  now: Date = new Date()
): Prisma.CampaignContactWhereInput {
  return {
    campaignId,
    OR: [{ status: "NOT_REACHED" }, { status: "FOLLOW_UP", nextContactAt: { lte: now } }],
  };
}

export function actionReasonLabel(status: ContactStatus): string {
  if (status === "NOT_REACHED") return "Não localizado";
  if (status === "FOLLOW_UP") return "Retorno atrasado";
  return "Pendente";
}

export type SupervisorQueueKind = "SAME_QUEUE" | "REQUEUED";

export function supervisorQueueKindLabel(kind: SupervisorQueueKind | string | null): string {
  if (kind === "REQUEUED") return "Supervisão redistribuiu este lead para a sua fila";
  if (kind === "SAME_QUEUE") return "Supervisão pediu para você entrar em contato novamente";
  return "Supervisão devolveu este lead à fila";
}
