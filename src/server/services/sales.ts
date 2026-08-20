import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-error";
import { requireSeller, type SessionUser } from "@/lib/permissions";
import { recordAudit } from "@/server/services/audit";
import type { AppointmentStatus, OpportunityStatus } from "@/generated/prisma/enums";

export async function listSellerOpportunities(user: SessionUser) {
  requireSeller(user);

  return prisma.opportunity.findMany({
    where: { sellerId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      originCampaign: { select: { id: true, name: true } },
    },
  });
}

export async function listSellerAppointments(user: SessionUser) {
  requireSeller(user);

  return prisma.appointment.findMany({
    where: { sellerId: user.id },
    orderBy: { scheduledAt: "asc" },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      originCampaignContact: {
        select: {
          campaign: { select: { id: true, name: true } },
        },
      },
    },
  });
}

export async function updateSellerOpportunity(
  user: SessionUser,
  opportunityId: string,
  input: { status?: OpportunityStatus; notes?: string | null }
) {
  requireSeller(user);
  const opportunity = await prisma.opportunity.findUnique({ where: { id: opportunityId } });
  if (!opportunity || opportunity.sellerId !== user.id) {
    throw new ApiError(404, "Oportunidade não encontrada");
  }

  const updated = await prisma.opportunity.update({
    where: { id: opportunityId },
    data: {
      status: input.status,
      notes: input.notes === undefined ? undefined : input.notes,
    },
  });
  await recordAudit(prisma, {
    userId: user.id,
    entityType: "Opportunity",
    entityId: opportunityId,
    action: "UPDATED",
    metadata: { status: updated.status },
  });
  return updated;
}

export async function updateSellerAppointment(
  user: SessionUser,
  appointmentId: string,
  input: { status?: AppointmentStatus; notes?: string | null }
) {
  requireSeller(user);
  const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appointment || appointment.sellerId !== user.id) {
    throw new ApiError(404, "Agendamento não encontrado");
  }

  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      status: input.status,
      notes: input.notes === undefined ? undefined : input.notes,
    },
  });
  await recordAudit(prisma, {
    userId: user.id,
    entityType: "Appointment",
    entityId: appointmentId,
    action: "UPDATED",
    metadata: { status: updated.status },
  });
  return updated;
}

export async function createSellerAppointment(
  user: SessionUser,
  input: { customerId: string; scheduledAt: string; notes?: string }
) {
  requireSeller(user);
  const opportunity = await prisma.opportunity.findFirst({
    where: { sellerId: user.id, customerId: input.customerId },
    select: { id: true },
  });
  if (!opportunity) {
    throw new ApiError(422, "Este cliente não está na sua carteira de oportunidades");
  }

  const created = await prisma.appointment.create({
    data: {
      customerId: input.customerId,
      sellerId: user.id,
      scheduledAt: new Date(input.scheduledAt),
      notes: input.notes || null,
    },
  });
  await recordAudit(prisma, {
    userId: user.id,
    entityType: "Appointment",
    entityId: created.id,
    action: "APPOINTMENT_CREATED",
    metadata: { customerId: input.customerId },
  });
  return created;
}
