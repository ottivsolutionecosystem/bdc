import type { ContactTemperature, DispositionCategory } from "@/generated/prisma/enums";

export function isSellersNotifyDispositionCategory(
  category: DispositionCategory | string | null | undefined
): boolean {
  return category === "POSITIVE" || category === "CONVERSION";
}

export function isEligibleForSellersGroupNotify(contact: {
  finalDisposition?: { category: DispositionCategory | string } | null;
}): boolean {
  return isSellersNotifyDispositionCategory(contact.finalDisposition?.category);
}

export function shouldStayOnQueueContact(contact: {
  transferredToSales: boolean;
  temperature: ContactTemperature;
  status: string;
}): boolean {
  if (contact.transferredToSales) return false;
  return contact.temperature === "HOT" || contact.status === "CONVERTED";
}
