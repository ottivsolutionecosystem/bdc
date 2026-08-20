import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-error";
import { requireAdmin, requireSupervisorOrAdmin, type SessionUser } from "@/lib/permissions";
import { getCampaignOrThrow } from "@/server/services/campaign";
import { assertCampaignAcceptsSetup } from "@/lib/campaign-lifecycle";
import { recordAudit } from "@/server/services/audit";
import type { CreateDispositionInput, UpdateDispositionInput } from "@/schemas/disposition";

async function ensureUndefinedSituationDisposition() {
  const existing = await prisma.campaignDisposition.findFirst({
    where: { campaignId: null, code: "undefined_situation" },
    select: { id: true },
  });
  if (existing) return;
  const last = await prisma.campaignDisposition.findFirst({
    where: { campaignId: null, category: "FOLLOW_UP" },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  await prisma.campaignDisposition.create({
    data: {
      campaignId: null,
      code: "undefined_situation",
      label: "Situação indefinida",
      category: "FOLLOW_UP",
      requiresNextContact: true,
      defaultTemperature: "FOLLOW_UP",
      order: (last?.order ?? 0) + 1,
    },
  });
}

export async function listActiveDispositions(campaignId: string) {
  await ensureUndefinedSituationDisposition();
  return prisma.campaignDisposition.findMany({
    where: {
      active: true,
      OR: [{ campaignId: null }, { campaignId }],
    },
    orderBy: [{ category: "asc" }, { order: "asc" }],
  });
}

export async function listDispositionsForSettings(campaignId: string) {
  return prisma.campaignDisposition.findMany({
    where: { OR: [{ campaignId: null }, { campaignId }] },
    orderBy: [{ category: "asc" }, { order: "asc" }],
  });
}

export async function createCampaignDisposition(
  user: SessionUser,
  campaignId: string,
  input: CreateDispositionInput
) {
  requireSupervisorOrAdmin(user);
  const campaign = await getCampaignOrThrow(campaignId);
  assertCampaignAcceptsSetup(campaign.status);

  const duplicate = await prisma.campaignDisposition.findFirst({
    where: {
      code: input.code,
      OR: [{ campaignId: null }, { campaignId }],
    },
    select: { id: true },
  });
  if (duplicate) {
    throw new ApiError(409, "Já existe um parecer com este código nesta campanha");
  }

  const last = await prisma.campaignDisposition.findFirst({
    where: { OR: [{ campaignId: null }, { campaignId }] },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const created = await prisma.campaignDisposition.create({
    data: {
      campaignId,
      code: input.code,
      label: input.label,
      category: input.category,
      requiresNextContact: input.requiresNextContact ?? false,
      defaultTemperature: input.defaultTemperature,
      order: (last?.order ?? 0) + 1,
    },
  });

  await recordAudit(prisma, {
    userId: user.id,
    entityType: "CampaignDisposition",
    entityId: created.id,
    action: "DISPOSITION_CREATED",
    metadata: { campaignId, code: created.code },
  });

  return created;
}

export async function createGlobalDisposition(user: SessionUser, input: CreateDispositionInput) {
  requireAdmin(user);

  const duplicate = await prisma.campaignDisposition.findFirst({
    where: { campaignId: null, code: input.code },
    select: { id: true },
  });
  if (duplicate) {
    throw new ApiError(409, "Já existe um parecer padrão com este código");
  }

  const last = await prisma.campaignDisposition.findFirst({
    where: { campaignId: null },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const created = await prisma.campaignDisposition.create({
    data: {
      campaignId: null,
      code: input.code,
      label: input.label,
      category: input.category,
      requiresNextContact: input.requiresNextContact ?? false,
      defaultTemperature: input.defaultTemperature,
      order: (last?.order ?? 0) + 1,
    },
  });

  await recordAudit(prisma, {
    userId: user.id,
    entityType: "CampaignDisposition",
    entityId: created.id,
    action: "DISPOSITION_CREATED",
    metadata: { code: created.code, global: true },
  });

  return created;
}

export async function updateCampaignDisposition(
  user: SessionUser,
  campaignId: string,
  dispositionId: string,
  input: UpdateDispositionInput
) {
  requireSupervisorOrAdmin(user);
  const disposition = await prisma.campaignDisposition.findUnique({ where: { id: dispositionId } });
  if (!disposition) throw new ApiError(404, "Parecer não encontrado");

  const isGlobal = disposition.campaignId === null;
  if (isGlobal) {
    requireAdmin(user);
  } else {
    requireSupervisorOrAdmin(user);
    if (disposition.campaignId !== campaignId) {
      throw new ApiError(404, "Parecer específico desta campanha não encontrado");
    }
    const campaign = await getCampaignOrThrow(campaignId);
    assertCampaignAcceptsSetup(campaign.status);
  }

  const updated = await prisma.campaignDisposition.update({
    where: { id: dispositionId },
    data: {
      label: input.label,
      requiresNextContact: input.requiresNextContact,
      defaultTemperature: input.defaultTemperature,
      active: input.active,
    },
  });

  await recordAudit(prisma, {
    userId: user.id,
    entityType: "CampaignDisposition",
    entityId: dispositionId,
    action: "DISPOSITION_UPDATED",
    metadata: { campaignId: disposition.campaignId, active: updated.active },
  });

  return updated;
}

export async function listSellers() {
  return prisma.user.findMany({
    where: { role: "SELLER", active: true },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
}
