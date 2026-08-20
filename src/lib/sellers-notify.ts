import type { ContactTemperature } from "@/generated/prisma/enums";

export function isEligibleForSellersGroupNotify(contact: {
  temperature: ContactTemperature;
  appointment?: unknown | null;
}): boolean {
  if (contact.appointment) return true;
  return contact.temperature === "HOT" || contact.temperature === "WARM";
}

export function shouldStayOnQueueContact(contact: {
  transferredToSales: boolean;
  temperature: ContactTemperature;
  status: string;
  appointment?: unknown | null;
}): boolean {
  if (contact.transferredToSales) return false;
  return (
    isEligibleForSellersGroupNotify(contact) || contact.status === "CONVERTED"
  );
}
