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

export function shouldStayOnQueueContact(
  contact: {
    transferredToSales: boolean;
    temperature: ContactTemperature;
    status: string;
    sellersGroupNotifiedAt?: string | Date | null;
    finalDisposition?: { category: DispositionCategory | string } | null;
  },
  sellersNotifyEnabled = false
): boolean {
  if (contact.transferredToSales) return false;
  const canTransfer = contact.temperature === "HOT" || contact.status === "CONVERTED";
  const waitingNotify =
    sellersNotifyEnabled && isEligibleForSellersGroupNotify(contact) && !contact.sellersGroupNotifiedAt;
  return canTransfer || waitingNotify;
}
