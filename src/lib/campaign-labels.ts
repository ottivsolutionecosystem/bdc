import type {
  CampaignStatus,
  ContactStatus,
  ContactTemperature,
  DispositionCategory,
  AppointmentStatus,
  OpportunityStatus,
  UserRole,
  AssignmentChangeReason,
} from "@/generated/prisma/enums";

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Administrador",
  SUPERVISOR: "Supervisor(a)",
  AGENT: "Agente",
  SELLER: "Vendedor(a)",
};

export const ASSIGNMENT_REASON_LABELS: Record<AssignmentChangeReason, string> = {
  IMPORT: "Importação",
  REDISTRIBUTE: "Redistribuição",
  MANUAL: "Movimentação manual",
  AGENT_REMOVED: "Agente removida",
};

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  CREATED: "Campanha criada",
  UPDATED: "Campanha atualizada",
  CONTACTS_IMPORTED: "Contatos importados",
  REDISTRIBUTED_ALL: "Base redistribuída",
  CONTACTS_REOPENED: "Leads devolvidos à fila sem parecer",
  CONTACTS_REQUEUED: "Leads redistribuídos sem parecer",
  CONTACT_DISPOSITION_CORRECTED: "Parecer corrigido",
  AGENT_ADDED: "Agente vinculada",
  AGENT_ACTIVATED: "Agente ativada",
  AGENT_DEACTIVATED: "Agente desativada",
  AGENT_REMOVED: "Agente removida",
  ATTEMPT_RECORDED: "Parecer registrado",
  APPOINTMENT_SCHEDULED: "Visita agendada",
  TRANSFERRED_TO_SALES: "Transferido para vendas",
  MOVED_AGENT: "Contato movimentado",
  DISPOSITION_CREATED: "Parecer criado",
  DISPOSITION_UPDATED: "Parecer atualizado",
  FICHA_UPDATED: "Ficha atualizada",
  USER_CREATED: "Usuário criado",
  USER_UPDATED: "Usuário atualizado",
  CUSTOMER_CREATED: "Cliente criado",
  CUSTOMER_UPDATED: "Cliente atualizado",
  PASSWORD_CHANGED: "Senha alterada",
  APPOINTMENT_CREATED: "Visita criada",
};

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  DRAFT: "Rascunho",
  ACTIVE: "Ativa",
  PAUSED: "Pausada",
  COMPLETED: "Concluída",
  CANCELED: "Cancelada",
};

export const CAMPAIGN_TYPE_LABELS: Record<string, string> = {
  event_invite: "Convite para evento",
  reactivation: "Reativação",
  after_sales: "Pós-venda",
  birthday: "Aniversariantes",
  trade_in: "Troca de veículo",
  other: "Outro",
};

export function campaignTypeLabel(type: string): string {
  return CAMPAIGN_TYPE_LABELS[type] ?? type;
}

export const CONTACT_STATUS_LABELS: Record<ContactStatus, string> = {
  UNTREATED: "Não tratado",
  ATTEMPTING: "Em tentativa",
  FOLLOW_UP: "Retorno",
  TREATED: "Tratado",
  CONVERTED: "Convertido",
  NOT_REACHED: "Não localizado",
};

export const TEMPERATURE_LABELS: Record<ContactTemperature, string> = {
  HOT: "Quente",
  WARM: "Morno",
  FOLLOW_UP: "Follow-up",
  COLD: "Frio",
  NOT_REACHED: "Não localizado",
};

export const DISPOSITION_CATEGORY_LABELS: Record<DispositionCategory, string> = {
  POSITIVE: "Positivo",
  CONVERSION: "Conversão",
  FOLLOW_UP: "Follow-up",
  NO_INTEREST: "Sem interesse",
  NOT_REACHED: "Contato não realizado",
};

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  SCHEDULED: "Agendado",
  DONE: "Realizado",
  CANCELED: "Cancelado",
};

export const OPPORTUNITY_STATUS_LABELS: Record<OpportunityStatus, string> = {
  OPEN: "Em negociação",
  WON: "Ganha",
  LOST: "Perdida",
};

export const PURCHASE_TIMELINE_LABELS: Record<string, string> = {
  NOW: "Agora",
  WITHIN_30D: "Até 30 dias",
  D60_90: "60 a 90 dias",
  NO_FORECAST: "Sem previsão",
};

export const EVENT_INTEREST_LABELS: Record<string, string> = {
  YES: "Sim",
  MAYBE: "Talvez",
  NO: "Não",
};

export type StatusBadgeVariant =
  | "status-untreated"
  | "status-attempting"
  | "status-follow-up"
  | "status-treated"
  | "status-converted"
  | "status-not-reached";

export type TemperatureBadgeVariant =
  | "temperature-hot"
  | "temperature-warm"
  | "temperature-follow-up"
  | "temperature-cold"
  | "temperature-not-reached";

export function statusBadgeVariant(status: ContactStatus): StatusBadgeVariant {
  const map: Record<ContactStatus, StatusBadgeVariant> = {
    UNTREATED: "status-untreated",
    ATTEMPTING: "status-attempting",
    FOLLOW_UP: "status-follow-up",
    TREATED: "status-treated",
    CONVERTED: "status-converted",
    NOT_REACHED: "status-not-reached",
  };
  return map[status];
}

export function temperatureBadgeVariant(temperature: ContactTemperature): TemperatureBadgeVariant {
  const map: Record<ContactTemperature, TemperatureBadgeVariant> = {
    HOT: "temperature-hot",
    WARM: "temperature-warm",
    FOLLOW_UP: "temperature-follow-up",
    COLD: "temperature-cold",
    NOT_REACHED: "temperature-not-reached",
  };
  return map[temperature];
}

/** Reaproveita os tokens de temperatura como paleta categórica para categoria de parecer. */
export function dispositionCategoryColorClass(category: DispositionCategory): string {
  const map: Record<DispositionCategory, string> = {
    POSITIVE: "bg-temperature-warm",
    CONVERSION: "bg-temperature-hot",
    FOLLOW_UP: "bg-temperature-follow-up",
    NO_INTEREST: "bg-temperature-cold",
    NOT_REACHED: "bg-temperature-not-reached",
  };
  return map[category];
}
