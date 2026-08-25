import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";
import type { SessionUser } from "@/lib/permissions";

export type IncomingAssignedContact = {
  id: string;
  name: string;
  phone: string;
};

function phoneLookupKeys(raw: string): string[] {
  const keys = new Set<string>();
  const { normalized, valid } = normalizePhone(raw);
  if (valid) keys.add(normalized);

  let digits = (raw ?? "").replace(/\D/g, "");
  if (digits.length > 11 && digits.startsWith("55")) digits = digits.slice(2);
  if (digits.length === 10 || digits.length === 11) keys.add(digits);
  else if (digits.length > 11) {
    keys.add(digits.slice(-11));
    keys.add(digits.slice(-10));
  }

  return [...keys];
}

/** Contato desta campanha atribuído à agente logada, ou null (sem vazar os das colegas). */
export async function findIncomingContactForAgent(
  user: SessionUser,
  campaignId: string,
  rawPhone: string,
): Promise<IncomingAssignedContact | null> {
  if (user.role !== "AGENT") return null;

  const keys = phoneLookupKeys(rawPhone);
  if (keys.length === 0) return null;

  const contact = await prisma.campaignContact.findFirst({
    where: {
      campaignId,
      assignedAgentId: user.id,
      phoneNormalized: { in: keys },
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, phone: true },
  });

  return contact;
}
