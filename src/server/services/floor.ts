import type { Prisma } from "@/generated/prisma/client";
import type { UserRole } from "@/generated/prisma/enums";

import { ApiError } from "@/lib/api-error";
import { todayKeyInAppTz } from "@/lib/datetime";
import { leadResumeStage, peopleInVisit, reaisToCents } from "@/lib/floor-labels";
import { normalizePhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { requireRole, type SessionUser } from "@/lib/permissions";
import type { CheckInInput, CloseDealInput, CreateFairEventInput, CreateFairVehicleInput, SaveAppraisalInput } from "@/schemas/floor";
import type { FloorEventDto, FloorLookupDto, FloorVehicleDto, FloorVisitDto } from "@/types/floor";
import { recordAudit } from "@/server/services/audit";
import { normalizePlate } from "@/server/services/plate-lookup";

const FLOOR_ROLES: UserRole[] = [
  "ADMIN",
  "SUPERVISOR",
  "RECEPTIONIST",
  "SELLER",
  "APPRAISER",
  "FINANCE",
  "DELIVERY",
];

const OPEN_STAGES = ["WITH_SELLER", "IN_APPRAISAL", "WITH_FINANCE", "AWAITING_DELIVERY"] as const;

function sellerIsAttending(
  eventId: string,
  sellerId: string,
  exceptVisitId?: string,
  db: Prisma.TransactionClient | typeof prisma = prisma,
) {
  return db.fairVisit.findFirst({
    where: {
      eventId,
      sellerId,
      stage: "WITH_SELLER",
      ...(exceptVisitId ? { id: { not: exceptVisitId } } : {}),
    },
    select: { id: true },
  });
}

function assertFloor(user: SessionUser) {
  requireRole(user, FLOOR_ROLES);
}

function isManager(user: SessionUser) {
  return user.role === "ADMIN" || user.role === "SUPERVISOR";
}

function assertManager(user: SessionUser) {
  requireRole(user, ["ADMIN", "SUPERVISOR"]);
}

function digits(value: string | null | undefined) {
  return (value ?? "").replace(/\D/g, "");
}

function emptyToNull(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new ApiError(422, "Data inválida");
  return date;
}

const visitInclude = {
  customer: { select: { id: true, name: true, phone: true, email: true, document: true } },
  seller: { select: { id: true, name: true } },
  receptionist: { select: { id: true, name: true } },
  financeUser: { select: { id: true, name: true } },
  interests: {
    include: {
      vehicle: {
        select: {
          id: true,
          brand: true,
          model: true,
          version: true,
          year: true,
          plate: true,
          color: true,
          priceCents: true,
          condition: true,
          transmission: true,
          bodyType: true,
          mileageKm: true,
          onPromotion: true,
          active: true,
        },
      },
    },
    orderBy: { createdAt: "asc" as const },
  },
  appraisal: {
    include: {
      photos: { select: { id: true, url: true, slot: true, caption: true, costCents: true }, orderBy: { createdAt: "asc" as const } },
      costs: { select: { kind: true, label: true, costCents: true }, orderBy: { sortOrder: "asc" as const } },
      appraiser: { select: { id: true, name: true } },
    },
  },
  delivery: {
    include: {
      vehicle: { select: { brand: true, model: true, version: true, year: true, priceCents: true } },
      assignee: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.FairVisitInclude;

type VisitRecord = Prisma.FairVisitGetPayload<{ include: typeof visitInclude }>;

function toVehicle(vehicle: VisitRecord["interests"][number]["vehicle"]): FloorVehicleDto {
  return {
    id: vehicle.id,
    brand: vehicle.brand,
    model: vehicle.model,
    version: vehicle.version,
    year: vehicle.year,
    plate: vehicle.plate,
    color: vehicle.color,
    priceCents: vehicle.priceCents,
    condition: vehicle.condition,
    transmission: vehicle.transmission,
    bodyType: vehicle.bodyType,
    mileageKm: vehicle.mileageKm,
    onPromotion: vehicle.onPromotion,
    active: vehicle.active,
  };
}

export function serializeVisit(visit: VisitRecord): FloorVisitDto {
  return {
    id: visit.id,
    eventId: visit.eventId,
    stage: visit.stage,
    companionCount: visit.companionCount,
    entryChannel: visit.entryChannel,
    awarenessSource: visit.awarenessSource,
    arrivalMode: visit.arrivalMode,
    notes: visit.notes,
    lostReason: visit.lostReason,
    bankName: visit.bankName,
    checkedInAt: visit.checkedInAt.toISOString(),
    appraisalRequestedAt: visit.appraisalRequestedAt?.toISOString() ?? null,
    transferredToFinanceAt: visit.transferredToFinanceAt?.toISOString() ?? null,
    deliveryRequestedAt: visit.deliveryRequestedAt?.toISOString() ?? null,
    deliveredAt: visit.deliveredAt?.toISOString() ?? null,
    customer: visit.customer,
    seller: visit.seller,
    receptionist: visit.receptionist,
    financeUser: visit.financeUser,
    interests: visit.interests.map((interest) => ({
      vehicleId: interest.vehicleId,
      primary: interest.primary,
      vehicle: toVehicle(interest.vehicle),
    })),
    appraisal: visit.appraisal
      ? {
          id: visit.appraisal.id,
          status: visit.appraisal.status,
          plate: visit.appraisal.plate,
          brand: visit.appraisal.brand,
          model: visit.appraisal.model,
          year: visit.appraisal.year,
          fipeValueCents: visit.appraisal.fipeValueCents,
          offerValueCents: visit.appraisal.offerValueCents,
          preparationCostCents: visit.appraisal.preparationCostCents,
          tireFrontLeft: visit.appraisal.tireFrontLeft,
          tireFrontRight: visit.appraisal.tireFrontRight,
          tireRearLeft: visit.appraisal.tireRearLeft,
          tireRearRight: visit.appraisal.tireRearRight,
          notes: visit.appraisal.notes,
          appraiser: visit.appraisal.appraiser,
          photos: visit.appraisal.photos,
          costs: visit.appraisal.costs,
        }
      : null,
    delivery: visit.delivery
      ? {
          id: visit.delivery.id,
          status: visit.delivery.status,
          vehicleId: visit.delivery.vehicleId,
          priceCents: visit.delivery.vehicle?.priceCents ?? null,
          vehicleTitle: visit.delivery.vehicle
            ? [visit.delivery.vehicle.brand, visit.delivery.vehicle.model, visit.delivery.vehicle.year].filter(Boolean).join(" ")
            : "Sem veículo de estoque",
          assignee: visit.delivery.assignee,
          pickupOn: visit.delivery.pickupOn ? visit.delivery.pickupOn.toISOString().slice(0, 10) : null,
        }
      : null,
  };
}

async function loadVisit(visitId: string) {
  const visit = await prisma.fairVisit.findUnique({ where: { id: visitId }, include: visitInclude });
  if (!visit) throw new ApiError(404, "Atendimento não encontrado");
  return visit;
}

function assertSellerOwns(user: SessionUser, visit: { sellerId: string }) {
  if (isManager(user)) return;
  if (user.role !== "SELLER" || visit.sellerId !== user.id) {
    throw new ApiError(403, "Este cliente não está com você");
  }
}

function assertFinanceOwns(user: SessionUser, visit: { financeUserId: string | null }) {
  if (isManager(user)) return;
  if (user.role !== "FINANCE" || (visit.financeUserId != null && visit.financeUserId !== user.id)) {
    throw new ApiError(403, "Este cliente está com outro F&I");
  }
}

export async function listFairEvents(user: SessionUser): Promise<FloorEventDto[]> {
  assertFloor(user);
  const events = await prisma.fairEvent.findMany({
    where: isManager(user) ? undefined : { status: "ACTIVE" },
    include: {
      campaign: { select: { name: true } },
      visits: {
        where: user.role === "SELLER" ? { sellerId: user.id } : undefined,
        select: { companionCount: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return events.map((event) => ({
    id: event.id,
    name: event.name,
    location: event.location,
    status: event.status,
    startsAt: event.startsAt?.toISOString() ?? null,
    endsAt: event.endsAt?.toISOString() ?? null,
    campaignName: event.campaign?.name ?? null,
    visitCount: event.visits.length,
    peopleCount: event.visits.reduce((sum, visit) => sum + peopleInVisit(visit.companionCount), 0),
  }));
}

export async function getFairEvent(user: SessionUser, eventId: string) {
  assertFloor(user);
  const event = await prisma.fairEvent.findUnique({
    where: { id: eventId },
    include: { campaign: { select: { id: true, name: true } } },
  });
  if (!event) throw new ApiError(404, "Feirão não encontrado");
  if (!isManager(user) && event.status !== "ACTIVE") {
    throw new ApiError(403, "Este feirão não está aberto");
  }
  return event;
}

export async function createFairEvent(user: SessionUser, input: CreateFairEventInput) {
  assertManager(user);
  const campaignId = emptyToNull(input.campaignId);
  if (campaignId) {
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { id: true } });
    if (!campaign) throw new ApiError(422, "Campanha inválida");
  }
  const event = await prisma.fairEvent.create({
    data: {
      name: input.name,
      location: emptyToNull(input.location),
      startsAt: parseDate(input.startsAt),
      endsAt: parseDate(input.endsAt),
      campaignId,
      status: input.status ?? "ACTIVE",
      createdById: user.id,
    },
  });
  await recordAudit(prisma, {
    userId: user.id,
    entityType: "FairEvent",
    entityId: event.id,
    action: "FAIR_EVENT_CREATED",
  });
  return event;
}

export async function updateFairEvent(
  user: SessionUser,
  eventId: string,
  input: {
    name?: string;
    location?: string | null;
    startsAt?: string | null;
    endsAt?: string | null;
    status?: "DRAFT" | "ACTIVE" | "CLOSED";
  }
) {
  assertManager(user);
  const existing = await prisma.fairEvent.findUnique({ where: { id: eventId } });
  if (!existing) throw new ApiError(404, "Feirão não encontrado");
  const event = await prisma.fairEvent.update({
    where: { id: eventId },
    data: {
      name: input.name,
      location: input.location === undefined ? undefined : emptyToNull(input.location),
      startsAt: input.startsAt === undefined ? undefined : parseDate(input.startsAt),
      endsAt: input.endsAt === undefined ? undefined : parseDate(input.endsAt),
      status: input.status,
    },
  });
  await recordAudit(prisma, {
    userId: user.id,
    entityType: "FairEvent",
    entityId: event.id,
    action: "FAIR_EVENT_UPDATED",
    metadata: { status: event.status },
  });
  return event;
}

export async function listFairVehicles(user: SessionUser, eventId: string): Promise<FloorVehicleDto[]> {
  await getFairEvent(user, eventId);
  const vehicles = await prisma.fairVehicle.findMany({
    where: { eventId, ...(isManager(user) ? {} : { active: true }) },
    orderBy: [{ brand: "asc" }, { model: "asc" }],
  });
  return vehicles;
}

export async function createFairVehicle(user: SessionUser, eventId: string, input: CreateFairVehicleInput) {
  assertManager(user);
  await getFairEvent(user, eventId);
  return prisma.fairVehicle.create({
    data: {
      eventId,
      brand: input.brand,
      model: input.model,
      version: emptyToNull(input.version),
      year: input.year ?? null,
      plate: input.plate ? normalizePlate(input.plate) : null,
      color: emptyToNull(input.color),
      priceCents: input.priceReais == null ? null : reaisToCents(input.priceReais),
      condition: emptyToNull(input.condition),
      transmission: emptyToNull(input.transmission),
      bodyType: emptyToNull(input.bodyType),
      mileageKm: input.mileageKm ?? null,
      onPromotion: input.onPromotion ?? false,
    },
  });
}

export async function updateFairVehicle(
  user: SessionUser,
  vehicleId: string,
  input: { active?: boolean; priceReais?: number | null }
) {
  assertManager(user);
  const vehicle = await prisma.fairVehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) throw new ApiError(404, "Veículo não encontrado");
  return prisma.fairVehicle.update({
    where: { id: vehicleId },
    data: {
      active: input.active,
      priceCents:
        input.priceReais === undefined ? undefined : input.priceReais == null ? null : reaisToCents(input.priceReais),
    },
  });
}

export async function listSellers() {
  return listActiveStaff("SELLER");
}

export async function listReceptionists() {
  return listActiveStaff("RECEPTIONIST");
}

export async function listFinanceUsers() {
  return listActiveStaff("FINANCE");
}

function listActiveStaff(role: "SELLER" | "FINANCE" | "RECEPTIONIST") {
  return prisma.user.findMany({
    where: { role, active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function listCampaignOptions(user: SessionUser) {
  assertManager(user);
  return prisma.campaign.findMany({
    select: { id: true, name: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function lookupFloorCustomer(
  user: SessionUser,
  query: { document?: string; phone?: string }
): Promise<FloorLookupDto> {
  requireRole(user, ["ADMIN", "SUPERVISOR", "RECEPTIONIST"]);
  const document = digits(query.document);
  const phone = query.phone ? normalizePhone(query.phone) : null;
  if (!document && !phone?.normalized) {
    throw new ApiError(422, "Informe o CPF ou o telefone");
  }

  const or: Prisma.CustomerWhereInput[] = [];
  if (phone?.normalized) or.push({ phone: { contains: phone.normalized.slice(-4) } });
  if (document.length >= 4) or.push({ document: { contains: document.slice(-4) } });

  const candidates = await prisma.customer.findMany({ where: { OR: or }, take: 40, orderBy: { updatedAt: "desc" } });
  const customer =
    candidates.find((item) => document && digits(item.document) === document) ??
    candidates.find((item) => phone?.valid && normalizePhone(item.phone).normalized === phone.normalized) ??
    null;

  if (!customer) return { found: false, customer: null, suggestion: null };

  const contact = await prisma.campaignContact.findFirst({
    where: {
      OR: [
        { customerId: customer.id },
        ...(phone?.valid ? [{ phoneNormalized: phone.normalized }] : []),
      ],
    },
    include: { campaign: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return {
    found: true,
    customer: {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      document: customer.document,
    },
    suggestion: contact
      ? {
          entryChannel: "CAMPAIGN",
          campaignName: contact.campaign.name,
          lastVehicle: contact.currentVehicle ?? contact.lastVehicle,
        }
      : null,
  };
}

export async function listAttendingSellerIds(user: SessionUser, eventId: string): Promise<string[]> {
  await getFairEvent(user, eventId);
  const rows = await prisma.fairVisit.findMany({
    where: { eventId, stage: "WITH_SELLER" },
    select: { sellerId: true },
  });
  return [...new Set(rows.map((row) => row.sellerId))];
}

export async function listVisits(user: SessionUser, eventId: string): Promise<FloorVisitDto[]> {
  await getFairEvent(user, eventId);
  const where: Prisma.FairVisitWhereInput = { eventId };
  if (user.role === "SELLER") where.sellerId = user.id;
  if (user.role === "APPRAISER") where.stage = "IN_APPRAISAL";
  if (user.role === "FINANCE") {
    where.stage = { in: ["WITH_FINANCE", "AWAITING_DELIVERY", "DELIVERED", "LOST"] };
    where.OR = [{ financeUserId: null }, { financeUserId: user.id }];
  }
  if (user.role === "DELIVERY") where.stage = { in: ["AWAITING_DELIVERY", "DELIVERED"] };

  const visits = await prisma.fairVisit.findMany({
    where,
    include: visitInclude,
    orderBy: { checkedInAt: "desc" },
  });
  return visits.map(serializeVisit);
}

async function findOrCreateCustomer(input: CheckInInput) {
  const phone = normalizePhone(input.phone);
  if (!phone.valid) throw new ApiError(422, "Informe um telefone válido");
  const document = digits(input.document);

  const lookup = await lookupFloorCustomer(
    { id: "", role: "RECEPTIONIST", active: true },
    { document, phone: input.phone }
  );

  if (lookup.customer) {
    return prisma.customer.update({
      where: { id: lookup.customer.id },
      data: {
        name: input.name,
        phone: phone.formatted,
        email: emptyToNull(input.email) ?? undefined,
        document: document || lookup.customer.document,
      },
    });
  }

  return prisma.customer.create({
    data: {
      name: input.name,
      phone: phone.formatted,
      email: emptyToNull(input.email),
      document: document || null,
    },
  });
}

export async function checkInVisit(user: SessionUser, eventId: string, input: CheckInInput) {
  requireRole(user, ["ADMIN", "SUPERVISOR", "RECEPTIONIST"]);
  const event = await getFairEvent(user, eventId);
  if (event.status !== "ACTIVE") throw new ApiError(409, "O feirão precisa estar aberto para receber clientes");

  const seller = await prisma.user.findUnique({ where: { id: input.sellerId } });
  if (!seller || seller.role !== "SELLER" || !seller.active) {
    throw new ApiError(422, "Vendedor inválido");
  }
  const receptionist = await prisma.user.findUnique({ where: { id: input.receptionistId } });
  if (!receptionist || receptionist.role !== "RECEPTIONIST" || !receptionist.active) {
    throw new ApiError(422, "Recepcionista inválida");
  }
  if (await sellerIsAttending(eventId, seller.id)) {
    throw new ApiError(409, "Este vendedor já está em atendimento");
  }

  const customer = await findOrCreateCustomer(input);
  const openVisit = await prisma.fairVisit.findFirst({
    where: { eventId, customerId: customer.id, stage: { in: [...OPEN_STAGES] } },
  });
  if (openVisit) throw new ApiError(409, "Este cliente já está em atendimento neste feirão");

  const opportunity = await prisma.opportunity.findFirst({
    where: { customerId: customer.id, status: "OPEN" },
    orderBy: { createdAt: "desc" },
  });
  const phone = normalizePhone(input.phone);
  const contact = await prisma.campaignContact.findFirst({
    where: {
      OR: [{ customerId: customer.id }, { phoneNormalized: phone.normalized }],
    },
    orderBy: { updatedAt: "desc" },
  });

  const visit = await prisma.$transaction(async (tx) => {
    if (await sellerIsAttending(eventId, seller.id, undefined, tx)) {
      throw new ApiError(409, "Este vendedor já está em atendimento");
    }
    if (opportunity && opportunity.sellerId !== seller.id) {
      await tx.opportunity.update({ where: { id: opportunity.id }, data: { sellerId: seller.id } });
    }
    const created = await tx.fairVisit.create({
      data: {
        eventId,
        customerId: customer.id,
        receptionistId: receptionist.id,
        sellerId: seller.id,
        companionCount: input.companionCount,
        entryChannel: input.entryChannel,
        awarenessSource: input.awarenessSource,
        arrivalMode: input.arrivalMode,
        notes: emptyToNull(input.notes),
        originCampaignId: contact?.campaignId ?? opportunity?.originCampaignId ?? null,
        originOpportunityId: opportunity?.id ?? null,
      },
      include: visitInclude,
    });
    await recordAudit(tx, {
      userId: user.id,
      entityType: "FairVisit",
      entityId: created.id,
      action: "FAIR_CHECKED_IN",
      metadata: { sellerId: seller.id, receptionistId: receptionist.id, companionCount: input.companionCount },
    });
    return created;
  });

  return serializeVisit(visit);
}

export async function updateVisitInterests(
  user: SessionUser,
  visitId: string,
  interests: { vehicleId: string; primary: boolean }[]
) {
  const visit = await loadVisit(visitId);
  assertSellerOwns(user, visit);
  if (visit.stage !== "WITH_SELLER" && visit.stage !== "IN_APPRAISAL") {
    throw new ApiError(409, "Os veículos de interesse não podem mais ser alterados");
  }

  const primaries = interests.filter((item) => item.primary);
  if (interests.length > 0 && primaries.length !== 1) {
    throw new ApiError(422, "Marque um veículo como o de maior interesse");
  }

  const vehicleIds = [...new Set(interests.map((item) => item.vehicleId))];
  if (vehicleIds.length !== interests.length) throw new ApiError(422, "Veículo repetido na lista");
  if (vehicleIds.length > 0) {
    const vehicles = await prisma.fairVehicle.findMany({
      where: { id: { in: vehicleIds }, eventId: visit.eventId, active: true },
    });
    if (vehicles.length !== vehicleIds.length) throw new ApiError(422, "Algum veículo não faz parte deste feirão");
  }

  await prisma.$transaction(async (tx) => {
    await tx.fairVisitInterest.deleteMany({ where: { visitId } });
    if (interests.length > 0) {
      await tx.fairVisitInterest.createMany({
        data: interests.map((item) => ({ visitId, vehicleId: item.vehicleId, primary: item.primary })),
      });
    }
    await recordAudit(tx, {
      userId: user.id,
      entityType: "FairVisit",
      entityId: visitId,
      action: "FAIR_INTERESTS_UPDATED",
      metadata: { count: interests.length },
    });
  });

  return serializeVisit(await loadVisit(visitId));
}

export async function requestAppraisal(user: SessionUser, visitId: string, plateRaw: string) {
  const visit = await loadVisit(visitId);
  assertSellerOwns(user, visit);
  if (visit.stage !== "WITH_SELLER") throw new ApiError(409, "A avaliação só pode ser pedida com o cliente no vendedor");
  if (visit.appraisal) throw new ApiError(409, "Este cliente já tem uma avaliação");

  const plate = normalizePlate(plateRaw);
  if (plate.length < 7) throw new ApiError(422, "Informe a placa");

  await prisma.$transaction(async (tx) => {
    await tx.fairAppraisal.create({ data: { visitId, plate, status: "REQUESTED" } });
    await tx.fairVisit.update({
      where: { id: visitId },
      data: { stage: "IN_APPRAISAL", appraisalRequestedAt: new Date() },
    });
    await recordAudit(tx, {
      userId: user.id,
      entityType: "FairVisit",
      entityId: visitId,
      action: "FAIR_APPRAISAL_REQUESTED",
      metadata: { plate },
    });
  });

  return serializeVisit(await loadVisit(visitId));
}

export async function cancelAppraisal(user: SessionUser, visitId: string) {
  const visit = await loadVisit(visitId);
  assertSellerOwns(user, visit);
  if (!visit.appraisal || visit.appraisal.status !== "REQUESTED") {
    throw new ApiError(409, "Só dá para cancelar uma avaliação que ainda não começou");
  }
  await prisma.$transaction(async (tx) => {
    await tx.fairAppraisal.delete({ where: { id: visit.appraisal!.id } });
    await tx.fairVisit.update({
      where: { id: visitId },
      data: { stage: "WITH_SELLER", appraisalRequestedAt: null },
    });
  });
  return serializeVisit(await loadVisit(visitId));
}

export async function saveAppraisal(user: SessionUser, appraisalId: string, input: SaveAppraisalInput) {
  requireRole(user, ["ADMIN", "SUPERVISOR", "APPRAISER"]);
  const appraisal = await prisma.fairAppraisal.findUnique({ where: { id: appraisalId }, include: { visit: true } });
  if (!appraisal) throw new ApiError(404, "Avaliação não encontrada");
  if (appraisal.visit.stage !== "IN_APPRAISAL") throw new ApiError(409, "Esta avaliação não está mais na fila");
  if (input.finish && (input.offerValueReais == null || input.offerValueReais <= 0)) {
    throw new ApiError(422, "Informe o valor a pagar no veículo para concluir a avaliação");
  }

  const costLines = (input.costs ?? []).filter(
    (item) => item.kind === "MECHANICAL" && (item.label.trim().length > 0 || item.costReais != null),
  );
  const mechanicalCents = costLines.reduce((total, item) => total + (item.costReais != null && item.costReais > 0 ? reaisToCents(item.costReais) : 0), 0);
  const damageCents = (input.damages ?? []).reduce(
    (total, item) => total + (item.costReais != null && item.costReais > 0 ? reaisToCents(item.costReais) : 0),
    0,
  );
  const preparationCostCents =
    input.costs || input.damages
      ? mechanicalCents + damageCents > 0
        ? mechanicalCents + damageCents
        : null
      : input.preparationCostReais == null
        ? null
        : reaisToCents(input.preparationCostReais);

  await prisma.$transaction(async (tx) => {
    if (input.costs || input.damages) {
      await tx.fairAppraisalCost.deleteMany({ where: { appraisalId } });
      if (costLines.length > 0) {
        await tx.fairAppraisalCost.createMany({
          data: costLines.map((item, index) => ({
            appraisalId,
            kind: "MECHANICAL" as const,
            label: item.label.trim() || "Defeito mecânico",
            costCents: item.costReais == null ? 0 : reaisToCents(item.costReais),
            sortOrder: index,
          })),
        });
      }
    }
    if (input.damages) {
      for (const item of input.damages) {
        await tx.fairAppraisalPhoto.updateMany({
          where: { id: item.photoId, appraisalId, slot: "DAMAGE" },
          data: {
            caption: emptyToNull(item.caption),
            costCents: item.costReais == null ? null : reaisToCents(item.costReais),
          },
        });
      }
    }
    await tx.fairAppraisal.update({
      where: { id: appraisalId },
      data: {
        appraiserId: user.id,
        plate: normalizePlate(input.plate),
        brand: emptyToNull(input.brand),
        model: emptyToNull(input.model),
        year: input.year ?? null,
        fipeValueCents: input.fipeValueReais == null ? null : reaisToCents(input.fipeValueReais),
        offerValueCents: input.offerValueReais == null ? null : reaisToCents(input.offerValueReais),
        preparationCostCents,
        tireFrontLeft: input.tireFrontLeft ?? null,
        tireFrontRight: input.tireFrontRight ?? null,
        tireRearLeft: input.tireRearLeft ?? null,
        tireRearRight: input.tireRearRight ?? null,
        notes: emptyToNull(input.notes),
        status: input.finish ? "DONE" : "IN_PROGRESS",
        completedAt: input.finish ? new Date() : null,
      },
    });
    if (input.finish) {
      const interests = await tx.fairVisitInterest.findMany({
        where: { visitId: appraisal.visitId },
        select: { primary: true },
      });
      if (interests.length === 0 || !interests.some((item) => item.primary)) {
        throw new ApiError(422, "Anexe um veículo de interesse antes de enviar ao F&I");
      }
      await tx.fairVisit.update({
        where: { id: appraisal.visitId },
        data: { stage: "WITH_FINANCE", transferredToFinanceAt: new Date() },
      });
    }
    await recordAudit(tx, {
      userId: user.id,
      entityType: "FairAppraisal",
      entityId: appraisalId,
      action: input.finish ? "FAIR_APPRAISAL_DONE" : "FAIR_APPRAISAL_SAVED",
    });
  });

  return serializeVisit(await loadVisit(appraisal.visitId));
}

const PHOTO_SLOTS = ["FRONT", "RIGHT", "LEFT", "REAR", "DASHBOARD", "DAMAGE"] as const;

export async function addAppraisalPhoto(
  user: SessionUser,
  appraisalId: string,
  url: string,
  slot: (typeof PHOTO_SLOTS)[number]
) {
  requireRole(user, ["ADMIN", "SUPERVISOR", "APPRAISER"]);
  if (!PHOTO_SLOTS.includes(slot)) throw new ApiError(422, "Tipo de foto inválido");
  const appraisal = await prisma.fairAppraisal.findUnique({
    where: { id: appraisalId },
    include: { visit: true },
  });
  if (!appraisal) throw new ApiError(404, "Avaliação não encontrada");
  if (appraisal.status === "DONE" || appraisal.visit.stage !== "IN_APPRAISAL") {
    throw new ApiError(409, "A avaliação já foi concluída");
  }
  if (slot === "DAMAGE") {
    const damageCount = await prisma.fairAppraisalPhoto.count({ where: { appraisalId, slot: "DAMAGE" } });
    if (damageCount >= 15) throw new ApiError(422, "Limite de 15 fotos de avarias");
  } else {
    await prisma.fairAppraisalPhoto.deleteMany({ where: { appraisalId, slot } });
  }
  await prisma.fairAppraisalPhoto.create({ data: { appraisalId, url, slot } });
  if (appraisal.status === "REQUESTED") {
    await prisma.fairAppraisal.update({ where: { id: appraisalId }, data: { status: "IN_PROGRESS", appraiserId: user.id } });
  }
  return serializeVisit(await loadVisit(appraisal.visitId));
}

export async function transferToFinance(user: SessionUser, visitId: string) {
  const visit = await loadVisit(visitId);
  assertSellerOwns(user, visit);
  if (visit.stage !== "WITH_SELLER") {
    throw new ApiError(409, "Este cliente não está mais com o vendedor");
  }
  if (visit.appraisal) throw new ApiError(409, "Conclua a avaliação antes de enviar ao F&I");
  if (visit.interests.length === 0 || !visit.interests.some((item) => item.primary)) {
    throw new ApiError(422, "Selecione os veículos e marque o de maior interesse");
  }

  await prisma.$transaction(async (tx) => {
    await tx.fairVisit.update({
      where: { id: visitId },
      data: { stage: "WITH_FINANCE", transferredToFinanceAt: new Date() },
    });
    await recordAudit(tx, {
      userId: user.id,
      entityType: "FairVisit",
      entityId: visitId,
      action: "FAIR_TRANSFERRED_TO_FINANCE",
    });
  });
  return serializeVisit(await loadVisit(visitId));
}

export async function handoffVisit(user: SessionUser, visitId: string, targetUserId: string) {
  const visit = await loadVisit(visitId);
  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, name: true, role: true, active: true },
  });
  if (!target || !target.active) throw new ApiError(422, "Selecione uma pessoa ativa");

  const withSeller = visit.stage === "WITH_SELLER" || visit.stage === "IN_APPRAISAL";
  if (withSeller) {
    assertSellerOwns(user, visit);
    if (target.role !== "SELLER") throw new ApiError(422, "Selecione um vendedor");
    if (target.id === visit.sellerId) throw new ApiError(422, "Este atendimento já está com esse vendedor");
  } else if (visit.stage === "WITH_FINANCE") {
    assertFinanceOwns(user, visit);
    if (target.role !== "FINANCE") throw new ApiError(422, "Selecione um F&I");
    if (target.id === visit.financeUserId) throw new ApiError(422, "Este atendimento já está com esse F&I");
  } else {
    throw new ApiError(409, "Este atendimento não pode ser transferido agora");
  }

  await prisma.$transaction(async (tx) => {
    if (withSeller) {
      if (await sellerIsAttending(visit.eventId, target.id, visit.id, tx)) {
        throw new ApiError(409, "Este vendedor já está em atendimento");
      }
      await tx.fairVisit.update({ where: { id: visitId }, data: { sellerId: target.id } });
      if (visit.originOpportunityId) {
        await tx.opportunity.update({
          where: { id: visit.originOpportunityId },
          data: { sellerId: target.id },
        });
      }
    } else {
      await tx.fairVisit.update({ where: { id: visitId }, data: { financeUserId: target.id } });
    }
    await recordAudit(tx, {
      userId: user.id,
      entityType: "FairVisit",
      entityId: visitId,
      action: withSeller ? "FAIR_SELLER_HANDOFF" : "FAIR_FINANCE_HANDOFF",
      metadata: withSeller
        ? { fromSellerId: visit.sellerId, toSellerId: target.id }
        : { fromFinanceUserId: visit.financeUserId, toFinanceUserId: target.id },
    });
  });

  return serializeVisit(await loadVisit(visitId));
}

export async function closeDeal(user: SessionUser, visitId: string, input: CloseDealInput) {
  requireRole(user, ["ADMIN", "SUPERVISOR", "FINANCE"]);
  const visit = await loadVisit(visitId);
  assertFinanceOwns(user, visit);
  if (visit.stage !== "WITH_FINANCE") throw new ApiError(409, "Este cliente não está no F&I");
  const vehicleId = input.vehicleId.trim();
  const vehicle = await prisma.fairVehicle.findFirst({
    where: { id: vehicleId, eventId: visit.eventId, active: true },
  });
  if (!vehicle) throw new ApiError(422, "O veículo não faz parte deste feirão");
  const pickupOn = input.atEvent ? null : pickupDate(input.pickupOn);

  await prisma.$transaction(async (tx) => {
    await tx.fairDelivery.create({
      data: { visitId, vehicleId, status: "QUEUED", pickupOn },
    });
    await tx.fairVisit.update({
      where: { id: visitId },
      data: {
        stage: "AWAITING_DELIVERY",
        financeUserId: user.role === "FINANCE" ? user.id : (visit.financeUserId ?? user.id),
        bankName: input.bankName,
        closedAt: new Date(),
        deliveryRequestedAt: new Date(),
      },
    });
    if (visit.originOpportunityId) {
      await tx.opportunity.update({
        where: { id: visit.originOpportunityId },
        data: { status: "WON" },
      });
    }
    await recordAudit(tx, {
      userId: user.id,
      entityType: "FairVisit",
      entityId: visitId,
      action: "FAIR_DEAL_CLOSED",
      metadata: { bankName: input.bankName, vehicleId, pickupOn: input.atEvent ? null : input.pickupOn },
    });
  });
  return serializeVisit(await loadVisit(visitId));
}

function pickupDate(value: string | null | undefined) {
  if (!value) throw new ApiError(422, "Informe a data da retirada do veículo");
  if (value < todayKeyInAppTz()) throw new ApiError(422, "A data da retirada não pode ser anterior a hoje");
  return new Date(`${value}T00:00:00.000Z`);
}

export async function loseVisit(user: SessionUser, visitId: string, lostReason: string) {
  const visit = await loadVisit(visitId);
  if (visit.stage === "DELIVERED" || visit.stage === "LOST") {
    throw new ApiError(409, "Este atendimento já foi encerrado");
  }
  const allowed =
    isManager(user) ||
    (user.role === "SELLER" && visit.sellerId === user.id && (visit.stage === "WITH_SELLER" || visit.stage === "IN_APPRAISAL")) ||
    (user.role === "FINANCE" &&
      (visit.stage === "WITH_FINANCE" || visit.stage === "AWAITING_DELIVERY") &&
      (visit.financeUserId == null || visit.financeUserId === user.id));
  if (!allowed) throw new ApiError(403, "Você não pode encerrar este atendimento");

  await prisma.$transaction(async (tx) => {
    if (visit.delivery) await tx.fairDelivery.delete({ where: { id: visit.delivery.id } });
    await tx.fairVisit.update({
      where: { id: visitId },
      data: {
        stage: "LOST",
        lostReason,
        closedAt: new Date(),
        financeUserId: user.role === "FINANCE" ? user.id : visit.financeUserId,
      },
    });
    if (visit.originOpportunityId) {
      await tx.opportunity.update({ where: { id: visit.originOpportunityId }, data: { status: "LOST" } });
    }
    await recordAudit(tx, {
      userId: user.id,
      entityType: "FairVisit",
      entityId: visitId,
      action: "FAIR_LOST",
      metadata: { lostReason },
    });
  });
  return serializeVisit(await loadVisit(visitId));
}

export async function recoverVisit(user: SessionUser, visitId: string) {
  assertManager(user);
  const visit = await loadVisit(visitId);
  if (visit.stage !== "LOST") throw new ApiError(409, "Só um lead que não fechou pode ser recuperado");
  const event = await prisma.fairEvent.findUnique({ where: { id: visit.eventId }, select: { status: true } });
  if (!event || event.status !== "ACTIVE") throw new ApiError(409, "O feirão precisa estar aberto para recuperar o lead");

  const stage = leadResumeStage({
    stage: visit.stage,
    hasAppraisal: visit.appraisal != null,
    reachedFinance: visit.transferredToFinanceAt != null,
  });

  await prisma.$transaction(async (tx) => {
    await tx.fairVisit.update({
      where: { id: visitId },
      data: { stage, lostReason: null, closedAt: null },
    });
    if (visit.originOpportunityId) {
      await tx.opportunity.update({ where: { id: visit.originOpportunityId }, data: { status: "OPEN" } });
    }
    await recordAudit(tx, {
      userId: user.id,
      entityType: "FairVisit",
      entityId: visitId,
      action: "FAIR_LEAD_RECOVERED",
      metadata: { stage },
    });
  });

  return serializeVisit(await loadVisit(visitId));
}

export async function advanceDelivery(user: SessionUser, deliveryId: string, action: "start" | "finish") {
  requireRole(user, ["ADMIN", "SUPERVISOR", "DELIVERY"]);
  const delivery = await prisma.fairDelivery.findUnique({ where: { id: deliveryId }, include: { visit: true } });
  if (!delivery) throw new ApiError(404, "Entrega não encontrada");
  if (delivery.visit.stage !== "AWAITING_DELIVERY") throw new ApiError(409, "Esta entrega não está na fila");

  if (action === "start") {
    if (delivery.status === "DONE") throw new ApiError(409, "Esta entrega já foi concluída");
    await prisma.fairDelivery.update({
      where: { id: deliveryId },
      data: { status: "IN_PROGRESS", assigneeId: user.id, startedAt: delivery.startedAt ?? new Date() },
    });
    await prisma.fairVisit.update({ where: { id: delivery.visitId }, data: { deliveryUserId: user.id } });
  } else {
    await prisma.$transaction(async (tx) => {
      await tx.fairDelivery.update({
        where: { id: deliveryId },
        data: { status: "DONE", assigneeId: user.id, deliveredAt: new Date() },
      });
      await tx.fairVisit.update({
        where: { id: delivery.visitId },
        data: { stage: "DELIVERED", deliveryUserId: user.id, deliveredAt: new Date() },
      });
      await recordAudit(tx, {
        userId: user.id,
        entityType: "FairVisit",
        entityId: delivery.visitId,
        action: "FAIR_DELIVERED",
      });
    });
  }

  return serializeVisit(await loadVisit(delivery.visitId));
}
