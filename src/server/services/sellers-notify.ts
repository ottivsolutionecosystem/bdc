import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-error";
import { APP_TIMEZONE, dateTimeFormatter } from "@/lib/datetime";
import { toWhatsAppUrl } from "@/lib/phone";
import { isEligibleForSellersGroupNotify } from "@/lib/sellers-notify";
import { TEMPERATURE_LABELS, PURCHASE_TIMELINE_LABELS, EVENT_INTEREST_LABELS } from "@/lib/campaign-labels";
import { assertCampaignOperable } from "@/lib/campaign-lifecycle";
import { isSupervisorOrAdmin, type SessionUser } from "@/lib/permissions";
import { recordAudit } from "@/server/services/audit";
import type { NotifySellersGroupInput } from "@/schemas/attempt";

const WEBHOOK_TIMEOUT_MS = 12_000;

function resolveSellersNotifyWebhookUrl(campaignUrl: string | null | undefined): string | null {
  const fromCampaign = campaignUrl?.trim();
  if (fromCampaign) return fromCampaign;
  const fromEnv = process.env.SELLERS_GROUP_WEBHOOK_URL?.trim();
  return fromEnv || null;
}

export function campaignHasSellersNotifyWebhook(campaignUrl: string | null | undefined): boolean {
  return Boolean(resolveSellersNotifyWebhookUrl(campaignUrl));
}

function sellersNotifyReason(contact: { appointment: unknown | null; temperature: string }) {
  return contact.appointment ? "appointment" : "interested";
}

function buildSellersGroupText(input: {
  campaignName: string;
  contactName: string;
  phone: string;
  lastVehicle: string | null;
  temperature: keyof typeof TEMPERATURE_LABELS;
  reason: "appointment" | "interested";
  appointmentAt: Date | null;
  appointmentSeller: string | null;
  agentName: string;
  note: string | null;
  whatsappUrl: string | null;
}): string {
  const lines = [
    input.reason === "appointment" ? "📅 Visita agendada — Auttus Prospect" : "🔥 Cliente interessado — Auttus Prospect",
    "",
    `Campanha: ${input.campaignName}`,
    `Cliente: ${input.contactName}`,
    `Telefone: ${input.phone}`,
    `Carro: ${input.lastVehicle ?? "não informado"}`,
    `Interesse: ${TEMPERATURE_LABELS[input.temperature]}`,
  ];

  if (input.appointmentAt) {
    const when = dateTimeFormatter.format(input.appointmentAt);
    const seller = input.appointmentSeller ? ` · vendedor ${input.appointmentSeller}` : "";
    lines.push(`Visita: ${when} (Cuiabá)${seller}`);
  }

  lines.push(`Agente: ${input.agentName}`);
  if (input.note) lines.push(`Recado: ${input.note}`);
  if (input.whatsappUrl) lines.push(`WhatsApp: ${input.whatsappUrl}`);
  lines.push("", "Entrar em contato com o cliente.");
  return lines.join("\n");
}

export async function notifySellersGroup(
  user: SessionUser,
  campaignId: string,
  contactId: string,
  input: NotifySellersGroupInput
) {
  await assertCampaignOperable(campaignId);

  const contact = await prisma.campaignContact.findUnique({
    where: { id: contactId },
    include: {
      campaign: { select: { id: true, name: true, sellersNotifyWebhookUrl: true } },
      appointment: { select: { scheduledAt: true, notes: true, seller: { select: { name: true } } } },
      assignedAgent: { select: { id: true, name: true } },
      finalDisposition: { select: { category: true } },
    },
  });

  if (!contact || contact.campaignId !== campaignId) {
    throw new ApiError(404, "Contato não encontrado nesta campanha");
  }
  if (user.role === "AGENT" && contact.assignedAgentId !== user.id) {
    throw new ApiError(403, "Este contato não está atribuído a você");
  }
  if (!isSupervisorOrAdmin(user) && user.role !== "AGENT") {
    throw new ApiError(403, "Você não tem permissão para avisar o grupo de vendedores");
  }
  if (!isEligibleForSellersGroupNotify(contact)) {
    throw new ApiError(
      422,
      "Só é possível avisar o grupo depois de um parecer positivo ou de conversão."
    );
  }

  const webhookUrl = resolveSellersNotifyWebhookUrl(contact.campaign.sellersNotifyWebhookUrl);
  if (!webhookUrl) {
    throw new ApiError(
      422,
      "Webhook do grupo de vendedores não configurado. Cole a URL do n8n em Configurações da campanha."
    );
  }

  const reason = sellersNotifyReason(contact);
  const note = input.note?.trim() || null;
  const whatsappUrl = toWhatsAppUrl(contact.phone);
  const text = buildSellersGroupText({
    campaignName: contact.campaign.name,
    contactName: contact.name,
    phone: contact.phone,
    lastVehicle: contact.lastVehicle,
    temperature: contact.temperature,
    reason,
    appointmentAt: contact.appointment?.scheduledAt ?? null,
    appointmentSeller: contact.appointment?.seller?.name ?? null,
    agentName: user.name?.trim() || contact.assignedAgent?.name || "Agente",
    note,
    whatsappUrl,
  });

  const payload = {
    event: "sellers_group_notify",
    reason,
    timezone: APP_TIMEZONE,
    text,
    note,
    campaign: { id: contact.campaign.id, name: contact.campaign.name },
    contact: {
      id: contact.id,
      name: contact.name,
      phone: contact.phone,
      phoneNormalized: contact.phoneNormalized,
      lastVehicle: contact.lastVehicle,
      lastPurchaseDate: contact.lastPurchaseDate?.toISOString() ?? null,
      temperature: contact.temperature,
      status: contact.status,
      notes: contact.notes,
      currentVehicle: contact.currentVehicle,
      purchaseTimeline: contact.purchaseTimeline
        ? PURCHASE_TIMELINE_LABELS[contact.purchaseTimeline] ?? contact.purchaseTimeline
        : null,
      interestedInEvent: contact.interestedInEvent
        ? EVENT_INTEREST_LABELS[contact.interestedInEvent] ?? contact.interestedInEvent
        : null,
      interestedInTrade: contact.interestedInTrade,
      whatsappUrl,
    },
    appointment: contact.appointment
      ? {
          scheduledAt: contact.appointment.scheduledAt.toISOString(),
          scheduledAtLocal: dateTimeFormatter.format(contact.appointment.scheduledAt),
          sellerName: contact.appointment.seller?.name ?? null,
          notes: contact.appointment.notes,
        }
      : null,
    agent: { id: user.id, name: user.name ?? contact.assignedAgent?.name ?? null },
  };

  let response: Response;
  try {
    response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
    });
  } catch {
    throw new ApiError(502, "Não foi possível falar com o n8n. Confira a URL do webhook.");
  }

  if (!response.ok) {
    throw new ApiError(502, `O n8n recusou o aviso (HTTP ${response.status}).`);
  }

  const updated = await prisma.campaignContact.update({
    where: { id: contactId },
    data: { sellersGroupNotifiedAt: new Date() },
    include: {
      supervisorQueuedBy: { select: { name: true } },
      appointment: { select: { scheduledAt: true, notes: true, seller: { select: { name: true } } } },
      finalDisposition: { select: { category: true } },
    },
  });

  await recordAudit(prisma, {
    userId: user.id,
    entityType: "CampaignContact",
    entityId: contactId,
    action: "SELLERS_GROUP_NOTIFIED",
    metadata: { campaignId, reason },
  });

  return updated;
}
