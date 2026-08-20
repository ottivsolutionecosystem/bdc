import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-error";
import { isSupervisorOrAdmin, requireSupervisorOrAdmin, type SessionUser } from "@/lib/permissions";
import { assertCampaignAcceptsSetup } from "@/lib/campaign-lifecycle";
import { recordAudit } from "@/server/services/audit";
import type { CreateCampaignInput, UpdateCampaignInput } from "@/schemas/campaign";

export async function listCampaignsForUser(user: SessionUser) {
  if (isSupervisorOrAdmin(user)) {
    return prisma.campaign.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { contacts: true, agents: true } },
      },
    });
  }

  return prisma.campaign.findMany({
    where: { agents: { some: { userId: user.id, active: true } } },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { contacts: true, agents: true } },
    },
  });
}

export async function getCampaignOrThrow(campaignId: string) {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new ApiError(404, "Campanha não encontrada");
  return campaign;
}

export async function createCampaign(user: SessionUser, input: CreateCampaignInput) {
  requireSupervisorOrAdmin(user);

  const campaign = await prisma.$transaction(async (tx) => {
    const created = await tx.campaign.create({
      data: {
        name: input.name,
        description: input.description || null,
        type: input.type,
        startDate: input.startDate ? new Date(input.startDate) : null,
        endDate: input.endDate ? new Date(input.endDate) : null,
        createdById: user.id,
      },
    });
    await tx.campaignDistributionState.create({ data: { campaignId: created.id } });
    await recordAudit(tx, {
      userId: user.id,
      entityType: "Campaign",
      entityId: created.id,
      action: "CREATED",
      metadata: { name: created.name },
    });
    return created;
  });

  return campaign;
}

export async function updateCampaign(user: SessionUser, campaignId: string, input: UpdateCampaignInput) {
  requireSupervisorOrAdmin(user);
  await getCampaignOrThrow(campaignId);

  if (input.status === "ACTIVE") {
    const activeAgents = await prisma.campaignAgent.count({ where: { campaignId, active: true } });
    if (activeAgents === 0) {
      throw new ApiError(422, "Vincule pelo menos uma agente antes de ativar a campanha.");
    }
  }

  return prisma.$transaction(async (tx) => {
    const { sellersNotifyWebhookUrl, ...auditable } = input;
    const updated = await tx.campaign.update({
      where: { id: campaignId },
      data: {
        name: input.name,
        description: input.description,
        type: input.type,
        status: input.status,
        startDate: input.startDate === undefined ? undefined : input.startDate ? new Date(input.startDate) : null,
        endDate: input.endDate === undefined ? undefined : input.endDate ? new Date(input.endDate) : null,
        sellersNotifyWebhookUrl:
          sellersNotifyWebhookUrl === undefined ? undefined : sellersNotifyWebhookUrl || null,
      },
    });
    await recordAudit(tx, {
      userId: user.id,
      entityType: "Campaign",
      entityId: campaignId,
      action: "UPDATED",
      metadata: {
        ...auditable,
        sellersNotifyWebhookConfigured:
          sellersNotifyWebhookUrl === undefined ? undefined : Boolean(sellersNotifyWebhookUrl),
      },
    });
    return updated;
  });
}

export async function listCampaignAgents(campaignId: string) {
  return prisma.campaignAgent.findMany({
    where: { campaignId },
    include: {
      user: { select: { id: true, name: true, email: true, active: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function listEligibleAgentUsers() {
  return prisma.user.findMany({
    where: { role: "AGENT", active: true },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
}

export async function addCampaignAgent(user: SessionUser, campaignId: string, targetUserId: string) {
  requireSupervisorOrAdmin(user);
  const campaign = await getCampaignOrThrow(campaignId);
  assertCampaignAcceptsSetup(campaign.status);

  const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!targetUser || targetUser.role !== "AGENT") {
    throw new ApiError(422, "Usuário informado não é um agente válido");
  }

  return prisma.$transaction(async (tx) => {
    const agent = await tx.campaignAgent.upsert({
      where: { campaignId_userId: { campaignId, userId: targetUserId } },
      update: { active: true },
      create: { campaignId, userId: targetUserId, active: true },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    await recordAudit(tx, {
      userId: user.id,
      entityType: "CampaignAgent",
      entityId: agent.id,
      action: "AGENT_ADDED",
      metadata: { campaignId, targetUserId },
    });
    return agent;
  });
}

export async function setCampaignAgentActive(
  user: SessionUser,
  campaignId: string,
  campaignAgentId: string,
  active: boolean
) {
  requireSupervisorOrAdmin(user);

  const campaign = await getCampaignOrThrow(campaignId);
  assertCampaignAcceptsSetup(campaign.status);

  const membership = await prisma.campaignAgent.findUnique({ where: { id: campaignAgentId } });
  if (!membership || membership.campaignId !== campaignId) {
    throw new ApiError(404, "Vínculo de agente não encontrado nesta campanha");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.campaignAgent.update({
      where: { id: campaignAgentId },
      data: { active },
    });
    await recordAudit(tx, {
      userId: user.id,
      entityType: "CampaignAgent",
      entityId: campaignAgentId,
      action: active ? "AGENT_ACTIVATED" : "AGENT_DEACTIVATED",
      metadata: { campaignId },
    });
    return updated;
  });
}
