import { prisma } from "@/lib/prisma";
import {
  ASSIGNMENT_REASON_LABELS,
  AUDIT_ACTION_LABELS,
  CAMPAIGN_STATUS_LABELS,
  CONTACT_STATUS_LABELS,
  TEMPERATURE_LABELS,
} from "@/lib/campaign-labels";
import { toCsv } from "@/lib/csv";
import { getCampaignOverview, getDispositionBreakdown } from "@/server/services/campaign-metrics";
import {
  listCampaignAssignmentHistory,
  listCampaignAuditLogs,
  listCampaignTransfers,
} from "@/server/services/campaign-history";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

function formatDate(value: Date | null | undefined) {
  return value ? dateFormatter.format(value) : "";
}

export async function exportCampaignContactsCsv(campaignId: string) {
  const contacts = await prisma.campaignContact.findMany({
    where: { campaignId },
    orderBy: { createdAt: "asc" },
    include: {
      assignedAgent: { select: { name: true } },
      finalDisposition: { select: { label: true } },
      customer: { select: { email: true, document: true } },
    },
  });

  return toCsv(
    [
      "Nome",
      "Telefone",
      "E-mail",
      "Documento",
      "Veículo",
      "Agente",
      "Status",
      "Temperatura",
      "Parecer",
      "Tentativas",
      "Última tentativa",
      "Próximo contato",
      "Transferido",
      "Observações",
    ],
    contacts.map((contact) => [
      contact.name,
      contact.phone,
      contact.customer?.email,
      contact.customer?.document,
      contact.lastVehicle,
      contact.assignedAgent?.name,
      CONTACT_STATUS_LABELS[contact.status],
      TEMPERATURE_LABELS[contact.temperature],
      contact.finalDisposition?.label,
      contact.attemptsCount,
      formatDate(contact.lastAttemptAt),
      formatDate(contact.nextContactAt),
      contact.transferredToSales ? "Sim" : "Não",
      contact.notes,
    ])
  );
}

export async function exportCampaignHistoryCsv(campaignId: string) {
  const [auditLogs, transfers, assignments] = await Promise.all([
    listCampaignAuditLogs(campaignId, 500),
    listCampaignTransfers(campaignId, 500),
    listCampaignAssignmentHistory(campaignId, 500),
  ]);

  const rows: Array<Array<string>> = [
    ...auditLogs.map((item) => [
      "Auditoria",
      formatDate(item.createdAt),
      item.user.name,
      AUDIT_ACTION_LABELS[item.action] ?? item.action,
      "",
    ]),
    ...transfers.map((item) => [
      "Transferência",
      formatDate(item.createdAt),
      item.agent.name,
      `${item.contact.name} → ${item.seller.name}`,
      item.disposition?.label ?? "",
    ]),
    ...assignments.map((item) => [
      "Redistribuição",
      formatDate(item.createdAt),
      item.changedBy.name,
      `${item.contact.name}: ${item.fromAgent?.name ?? "—"} → ${item.toAgent?.name ?? "—"}`,
      ASSIGNMENT_REASON_LABELS[item.reason],
    ]),
  ];

  return toCsv(["Tipo", "Quando", "Quem", "Detalhe", "Complemento"], rows);
}

export async function exportCampaignDashboardCsv(campaignId: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { name: true, status: true },
  });
  const [overview, breakdown] = await Promise.all([
    getCampaignOverview(campaignId),
    getDispositionBreakdown(campaignId),
  ]);

  const summary = toCsv(
    ["Campanha", "Status", "Base", "Tratados", "Pendentes", "Em retorno", "Interessados", "Agendamentos", "Sem interesse", "Não localizados", "Progresso %"],
    [
      [
        campaign?.name,
        campaign ? CAMPAIGN_STATUS_LABELS[campaign.status] : "",
        overview.total,
        overview.treated,
        overview.pending,
        overview.followUp,
        overview.interested,
        overview.appointments,
        overview.noInterest,
        overview.notReached,
        overview.completionPercent,
      ],
    ]
  );
  const dispositions = toCsv(
    ["Parecer", "Categoria", "Quantidade", "%"],
    breakdown.map((item) => [item.label, item.category, item.count, item.percent])
  );
  return `${summary}\r\n\r\n${dispositions}`;
}
