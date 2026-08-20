import type {
  ContactStatus,
  ContactTemperature,
  DispositionCategory,
  EventInterest,
  PurchaseTimeline,
} from "@/generated/prisma/enums";

export type QueueContact = {
  id: string;
  name: string;
  phone: string;
  lastVehicle: string | null;
  lastPurchaseDate: string | null;
  status: ContactStatus;
  temperature: ContactTemperature;
  attemptsCount: number;
  notes: string | null;
  interestedInEvent: EventInterest | null;
  stillOwnsLastVehicle: boolean | null;
  interestedInTrade: boolean | null;
  currentVehicle: string | null;
  purchaseTimeline: PurchaseTimeline | null;
  transferredToSales: boolean;
  sellersGroupNotifiedAt: string | null;
  appointment: {
    scheduledAt: string;
    notes: string | null;
    seller: { name: string } | null;
  } | null;
  supervisorQueueKind: string | null;
  supervisorQueueNote: string | null;
  supervisorQueuedAt: string | null;
  supervisorQueuedBy: { name: string } | null;
};

export type DispositionOption = {
  id: string;
  code: string;
  label: string;
  category: DispositionCategory;
  requiresNextContact: boolean;
};

export type Seller = {
  id: string;
  name: string;
  email: string;
};
