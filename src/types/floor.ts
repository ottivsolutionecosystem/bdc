import type {
  FairAppraisalStatus,
  FairArrivalMode,
  FairAwarenessSource,
  FairDeliveryStatus,
  FairEntryChannel,
  FairEventStatus,
  FairPhotoSlot,
  FairTaskPriority,
  FairTaskStatus,
  FairVisitStage,
  TireCondition,
} from "@/generated/prisma/enums";

export type FloorPerson = { id: string; name: string };

export type FloorVehicleDto = {
  id: string;
  brand: string;
  model: string;
  version: string | null;
  year: number | null;
  plate: string | null;
  color: string | null;
  priceCents: number | null;
  condition: string | null;
  transmission: string | null;
  bodyType: string | null;
  mileageKm: number | null;
  onPromotion: boolean;
  active: boolean;
};

export type FloorVisitDto = {
  id: string;
  eventId: string;
  stage: FairVisitStage;
  companionCount: number;
  entryChannel: FairEntryChannel;
  awarenessSource: FairAwarenessSource;
  arrivalMode: FairArrivalMode;
  notes: string | null;
  lostReason: string | null;
  bankName: string | null;
  checkedInAt: string;
  appraisalRequestedAt: string | null;
  transferredToFinanceAt: string | null;
  deliveryRequestedAt: string | null;
  deliveredAt: string | null;
  customer: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    document: string | null;
  };
  seller: FloorPerson;
  receptionist: FloorPerson;
  financeUser: FloorPerson | null;
  interests: {
    vehicleId: string;
    primary: boolean;
    vehicle: FloorVehicleDto;
  }[];
  appraisal: {
    id: string;
    status: FairAppraisalStatus;
    plate: string;
    brand: string | null;
    model: string | null;
    year: number | null;
    fipeValueCents: number | null;
    offerValueCents: number | null;
    preparationCostCents: number | null;
    tireFrontLeft: TireCondition | null;
    tireFrontRight: TireCondition | null;
    tireRearLeft: TireCondition | null;
    tireRearRight: TireCondition | null;
    notes: string | null;
    appraiser: FloorPerson | null;
    photos: { id: string; url: string; slot: FairPhotoSlot; caption: string | null; costCents: number | null }[];
    costs: { kind: "DAMAGE" | "MECHANICAL"; label: string; costCents: number }[];
  } | null;
  delivery: {
    id: string;
    status: FairDeliveryStatus;
    vehicleId: string | null;
    priceCents: number | null;
    vehicleTitle: string;
    assignee: FloorPerson | null;
    pickupOn: string | null;
  } | null;
};

export type FloorTaskDto = {
  id: string;
  title: string;
  description: string | null;
  area: string | null;
  ownerNames: string[];
  startsOn: string | null;
  dueOn: string | null;
  priority: FairTaskPriority;
  status: FairTaskStatus;
  updatedAt: string;
};

export type FloorExpenseDto = {
  id: string;
  title: string;
  notes: string | null;
  plannedCents: number | null;
  actualCents: number | null;
  spentOn: string | null;
  updatedAt: string;
};

export type FloorProjectionDto = {
  vehicleGoal: number | null;
  budgetCents: number | null;
  captureGoalCents: number | null;
  capturedCents: number | null;
};

export type FloorControlDto = {
  tasks: FloorTaskDto[];
  expenses: FloorExpenseDto[];
  projection: FloorProjectionDto;
};

export type FloorEventDto = {
  id: string;
  name: string;
  location: string | null;
  status: FairEventStatus;
  startsAt: string | null;
  endsAt: string | null;
  campaignName: string | null;
  visitCount: number;
  peopleCount: number;
};

export type FloorLookupDto = {
  found: boolean;
  customer: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    document: string | null;
  } | null;
  suggestion: {
    entryChannel: FairEntryChannel;
    campaignName: string | null;
    lastVehicle: string | null;
  } | null;
};
