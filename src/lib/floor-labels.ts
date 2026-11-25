import type {
  FairArrivalMode,
  FairAwarenessSource,
  FairDeliveryStatus,
  FairEntryChannel,
  FairEventStatus,
  FairTaskPriority,
  FairTaskStatus,
  FairVisitStage,
} from "@/generated/prisma/enums";

export const FAIR_EVENT_STATUS_LABELS: Record<FairEventStatus, string> = {
  DRAFT: "Rascunho",
  ACTIVE: "Aberto",
  CLOSED: "Encerrado",
};

export const FAIR_TASK_STATUS_LABELS: Record<FairTaskStatus, string> = {
  PENDING: "Pendente",
  IN_PROGRESS: "Em andamento",
  WAITING: "Aguardando terceiros",
  BLOCKED: "Bloqueada",
  DONE: "Concluída",
  CANCELED: "Cancelada",
};

export const FAIR_TASK_PRIORITY_LABELS: Record<FairTaskPriority, string> = {
  LOW: "Baixa",
  NORMAL: "Normal",
  HIGH: "Alta",
  CRITICAL: "Crítica",
};

export const FAIR_STAGE_LABELS: Record<FairVisitStage, string> = {
  WITH_SELLER: "Com o vendedor",
  IN_APPRAISAL: "Em avaliação",
  WITH_FINANCE: "No F&I",
  AWAITING_DELIVERY: "Aguardando entrega",
  DELIVERED: "Entregue",
  LOST: "Não fechou",
};

export const ENTRY_CHANNEL_LABELS: Record<FairEntryChannel, string> = {
  WALK_IN: "Chegou na porta",
  CAMPAIGN: "Agendado pela campanha",
  RETURN: "Retorno",
};

export const AWARENESS_LABELS: Record<FairAwarenessSource, string> = {
  INSTAGRAM: "Instagram / redes",
  RADIO: "Rádio",
  REFERRAL: "Indicação",
  OUTDOOR: "Outdoor / faixa",
  WHATSAPP: "WhatsApp",
  CALL_CAMPAIGN: "Campanha de ligação",
  PASSING_BY: "Passou na frente",
  OTHER: "Outro",
};

export const ARRIVAL_MODE_LABELS: Record<FairArrivalMode, string> = {
  OWN_CAR: "Carro próprio",
  RIDESHARE: "Aplicativo",
  BUS: "Ônibus",
  WALK: "A pé",
  RIDE: "Carona",
  OTHER: "Outro",
};

export const DELIVERY_STATUS_LABELS: Record<FairDeliveryStatus, string> = {
  QUEUED: "Na fila",
  IN_PROGRESS: "Em entrega",
  DONE: "Entregue",
};

export const PHOTO_SLOT_LABELS = {
  FRONT: "Frente",
  RIGHT: "Lateral direita",
  LEFT: "Lateral esquerda",
  REAR: "Traseira",
  DASHBOARD: "Painel com km",
  DAMAGE: "Avaria",
} as const;

export const FIXED_PHOTO_SLOTS = ["FRONT", "RIGHT", "LEFT", "REAR", "DASHBOARD"] as const;

export const TIRE_FIELDS = [
  ["tireFrontLeft", "Dianteiro esquerdo"],
  ["tireFrontRight", "Dianteiro direito"],
  ["tireRearLeft", "Traseiro esquerdo"],
  ["tireRearRight", "Traseiro direito"],
] as const;

export const TIRE_CONDITION_LABELS = {
  GOOD: "Bom",
  HALF: "Meia-vida",
  REPLACE: "Hora de trocar",
} as const;

export const FINANCE_BANKS = [
  "BV",
  "Santander",
  "Pan",
  "Itaú",
  "Bradesco",
  "C6",
  "Safra",
  "À vista",
  "Outro",
] as const;

/** Lead que não fechou volta para a última etapa em que ainda havia trabalho. */
export function leadResumeStage(input: {
  stage: FairVisitStage;
  hasAppraisal: boolean;
  reachedFinance: boolean;
}): FairVisitStage {
  if (input.stage !== "LOST") return input.stage;
  if (input.reachedFinance) return "WITH_FINANCE";
  if (input.hasAppraisal) return "IN_APPRAISAL";
  return "WITH_SELLER";
}

export function peopleInVisit(companionCount: number): number {
  return 1 + companionCount;
}

export const MECHANICAL_DEFECTS = [
  "Motor",
  "Câmbio",
  "Embreagem",
  "Suspensão",
  "Freios",
  "Direção",
  "Ar-condicionado",
  "Arrefecimento",
  "Elétrica",
  "Escapamento",
  "Correia dentada",
  "Amortecedores",
  "Homocinética",
  "Catalisador",
  "Bomba de combustível",
] as const;

export const VEHICLE_CONDITIONS = ["Novo", "Seminovo", "Usado"] as const;
export const VEHICLE_TRANSMISSIONS = ["Manual", "Automático", "Automatizado", "CVT"] as const;
export const VEHICLE_BODY_TYPES = ["Hatch", "Sedan", "SUV", "Picape", "Minivan", "Coupé", "Utilitário"] as const;

export function vehicleTitle(vehicle: {
  brand: string;
  model: string;
  version?: string | null;
  year?: number | null;
}): string {
  return [vehicle.brand, vehicle.model, vehicle.version, vehicle.year].filter(Boolean).join(" ");
}

export function formatBrlFromCents(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function reaisToCents(reais: number): number {
  return Math.round(reais * 100);
}

export function formatReaisInput(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Enquanto digita: 45000 vira 45.000 e 45000,5 vira 45.000,5. */
export function maskReaisInput(raw: string): string {
  const trimmed = raw.trim().replace(/\s/g, "").replace(/^R\$/i, "");
  const decimalDot = trimmed.includes(",") ? trimmed : trimmed.replace(/\.(\d{1,2})$/, ",$1");
  const cleaned = decimalDot.replace(/[^\d,]/g, "");
  if (!cleaned) return "";
  const comma = cleaned.indexOf(",");
  const wholeDigits = (comma === -1 ? cleaned : cleaned.slice(0, comma)).replace(/^0+(?=\d)/, "");
  const grouped = groupThousands(wholeDigits || (comma === -1 ? "" : "0"));
  if (comma === -1) return grouped;
  const fraction = cleaned.slice(comma + 1).replace(/\D/g, "").slice(0, 2);
  return `${grouped},${fraction}`;
}

/** Ao sair do campo: 45.000 vira 45.000,00. */
export function completeReaisInput(raw: string): string {
  const value = parseReais(raw);
  if (value == null) return "";
  return formatReaisInput(reaisToCents(value));
}

function groupThousands(digits: string): string {
  if (!digits) return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Quanto o valor a pagar representa da FIPE, em porcentagem inteira. */
export function fipePayPercent(
  payCents: number | null | undefined,
  fipeCents: number | null | undefined,
): number | null {
  if (payCents == null || fipeCents == null || fipeCents <= 0) return null;
  return Math.round((payCents / fipeCents) * 100);
}

export function fipePayLabel(
  payCents: number | null | undefined,
  fipeCents: number | null | undefined,
): string | null {
  const percent = fipePayPercent(payCents, fipeCents);
  return percent == null ? null : `${percent}% da FIPE`;
}

/** Valor a pagar somado ao gasto previsto. É o anexo técnico do carro pronto. */
export function preparedVehicleCents(
  payCents: number | null | undefined,
  preparationCents: number | null | undefined,
): number | null {
  if (payCents == null) return null;
  return payCents + (preparationCents ?? 0);
}

/** Aceita 45000, 45000.50, 45.000 e 45.000,00. */
export function parseReais(raw: string): number | null {
  const trimmed = raw.trim().replace(/\s/g, "").replace(/^R\$/i, "");
  if (!trimmed) return null;
  let normalized = trimmed;
  if (normalized.includes(",")) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(normalized)) {
    normalized = normalized.replace(/\./g, "");
  }
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}
