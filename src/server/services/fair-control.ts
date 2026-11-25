import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-error";
import { reaisToCents } from "@/lib/floor-labels";
import { requireAdmin, type SessionUser } from "@/lib/permissions";
import type {
  CreateFairExpenseInput,
  CreateFairTaskInput,
  UpdateFairExpenseInput,
  UpdateFairProjectionInput,
  UpdateFairTaskInput,
} from "@/schemas/floor";
import { recordAudit } from "@/server/services/audit";
import { getFairEvent } from "@/server/services/floor";
import type { FloorControlDto, FloorExpenseDto, FloorPerson, FloorProjectionDto, FloorTaskDto } from "@/types/floor";

function dateKey(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

function dateOrNull(value: string | null | undefined): Date | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new ApiError(422, "Data inválida");
  return new Date(`${value}T00:00:00.000Z`);
}

function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function centsOrNull(reais: number | null | undefined): number | null {
  if (reais == null) return null;
  return reaisToCents(reais);
}

function assertFresh(updatedAt: string | undefined, current: Date) {
  if (updatedAt && current.toISOString() !== updatedAt) {
    throw new ApiError(409, "Este registro foi alterado. Recarregue e tente de novo.");
  }
}

async function resolveOwners(names: string[] | undefined) {
  const users = await prisma.user.findMany({ where: { active: true }, select: { name: true } });
  const seen = new Set<string>();
  const owners: string[] = [];
  for (const raw of names ?? []) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const key = trimmed.toLocaleLowerCase("pt-BR");
    if (seen.has(key)) continue;
    seen.add(key);
    const hit = users.find((person) => person.name.trim().toLocaleLowerCase("pt-BR") === key);
    owners.push(hit?.name ?? trimmed);
    if (owners.length >= 20) break;
  }
  return owners;
}

export async function listFairStaff(): Promise<FloorPerson[]> {
  const users = await prisma.user.findMany({
    where: { active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return users;
}

export async function listFairControl(user: SessionUser, eventId: string): Promise<FloorControlDto> {
  const event = await getFairEvent(user, eventId);
  const [tasks, expenses] = await Promise.all([
    prisma.fairTask.findMany({
      where: { eventId },
      orderBy: [{ dueOn: "asc" }, { createdAt: "asc" }],
    }),
    prisma.fairExpense.findMany({ where: { eventId }, orderBy: { createdAt: "asc" } }),
  ]);
  return {
    tasks: tasks.map(toTask),
    expenses: expenses.map(toExpense),
    projection: {
      vehicleGoal: event.vehicleGoal,
      budgetCents: event.budgetCents,
      captureGoalCents: event.captureGoalCents,
      capturedCents: event.capturedCents,
    },
  };
}

export async function createFairTask(user: SessionUser, eventId: string, input: CreateFairTaskInput) {
  requireAdmin(user);
  await getFairEvent(user, eventId);
  const task = await prisma.fairTask.create({
    data: {
      eventId,
      title: input.title.trim(),
      description: emptyToNull(input.description),
      area: emptyToNull(input.area),
      ownerNames: await resolveOwners(input.ownerNames),
      startsOn: dateOrNull(input.startsOn),
      dueOn: dateOrNull(input.dueOn),
      priority: input.priority ?? "NORMAL",
      status: input.status ?? "PENDING",
    },
  });
  await recordAudit(prisma, {
    userId: user.id,
    entityType: "FairTask",
    entityId: task.id,
    action: "FAIR_TASK_CREATED",
    metadata: { eventId },
  });
  return task;
}

export async function updateFairTask(user: SessionUser, eventId: string, taskId: string, input: UpdateFairTaskInput) {
  requireAdmin(user);
  const existing = await prisma.fairTask.findFirst({ where: { id: taskId, eventId } });
  if (!existing) throw new ApiError(404, "Tarefa não encontrada");
  assertFresh(input.updatedAt, existing.updatedAt);
  const owners = input.ownerNames === undefined ? undefined : await resolveOwners(input.ownerNames);
  const task = await prisma.fairTask.update({
    where: { id: taskId },
    data: {
      title: input.title?.trim(),
      description: input.description === undefined ? undefined : emptyToNull(input.description),
      area: input.area === undefined ? undefined : emptyToNull(input.area),
      ownerNames: owners,
      startsOn: input.startsOn === undefined ? undefined : dateOrNull(input.startsOn),
      dueOn: input.dueOn === undefined ? undefined : dateOrNull(input.dueOn),
      priority: input.priority,
      status: input.status,
    },
  });
  await recordAudit(prisma, {
    userId: user.id,
    entityType: "FairTask",
    entityId: task.id,
    action: "FAIR_TASK_UPDATED",
    metadata: { eventId, status: task.status },
  });
  return task;
}

export async function deleteFairTask(user: SessionUser, eventId: string, taskId: string) {
  requireAdmin(user);
  const existing = await prisma.fairTask.findFirst({ where: { id: taskId, eventId } });
  if (!existing) throw new ApiError(404, "Tarefa não encontrada");
  await prisma.fairTask.delete({ where: { id: taskId } });
  await recordAudit(prisma, {
    userId: user.id,
    entityType: "FairTask",
    entityId: taskId,
    action: "FAIR_TASK_DELETED",
    metadata: { eventId },
  });
}

export async function createFairExpense(user: SessionUser, eventId: string, input: CreateFairExpenseInput) {
  requireAdmin(user);
  await getFairEvent(user, eventId);
  const expense = await prisma.fairExpense.create({
    data: {
      eventId,
      title: input.title.trim(),
      notes: emptyToNull(input.notes),
      plannedCents: centsOrNull(input.plannedReais),
      actualCents: centsOrNull(input.actualReais),
      spentOn: dateOrNull(input.spentOn),
    },
  });
  await recordAudit(prisma, {
    userId: user.id,
    entityType: "FairExpense",
    entityId: expense.id,
    action: "FAIR_EXPENSE_CREATED",
    metadata: { eventId },
  });
  return expense;
}

export async function updateFairExpense(
  user: SessionUser,
  eventId: string,
  expenseId: string,
  input: UpdateFairExpenseInput,
) {
  requireAdmin(user);
  const existing = await prisma.fairExpense.findFirst({ where: { id: expenseId, eventId } });
  if (!existing) throw new ApiError(404, "Gasto não encontrado");
  assertFresh(input.updatedAt, existing.updatedAt);
  return prisma.fairExpense.update({
    where: { id: expenseId },
    data: {
      title: input.title?.trim(),
      notes: input.notes === undefined ? undefined : emptyToNull(input.notes),
      plannedCents: input.plannedReais === undefined ? undefined : centsOrNull(input.plannedReais),
      actualCents: input.actualReais === undefined ? undefined : centsOrNull(input.actualReais),
      spentOn: input.spentOn === undefined ? undefined : dateOrNull(input.spentOn),
    },
  });
}

export async function deleteFairExpense(user: SessionUser, eventId: string, expenseId: string) {
  requireAdmin(user);
  const existing = await prisma.fairExpense.findFirst({ where: { id: expenseId, eventId } });
  if (!existing) throw new ApiError(404, "Gasto não encontrado");
  await prisma.fairExpense.delete({ where: { id: expenseId } });
}

export async function updateFairProjection(user: SessionUser, eventId: string, input: UpdateFairProjectionInput) {
  requireAdmin(user);
  await getFairEvent(user, eventId);
  const event = await prisma.fairEvent.update({
    where: { id: eventId },
    data: {
      vehicleGoal: input.vehicleGoal === undefined ? undefined : input.vehicleGoal,
      budgetCents: input.budgetReais === undefined ? undefined : centsOrNull(input.budgetReais),
      captureGoalCents: input.captureGoalReais === undefined ? undefined : centsOrNull(input.captureGoalReais),
      capturedCents: input.capturedReais === undefined ? undefined : centsOrNull(input.capturedReais),
    },
  });
  await recordAudit(prisma, {
    userId: user.id,
    entityType: "FairEvent",
    entityId: eventId,
    action: "FAIR_PROJECTION_UPDATED",
  });
  return event;
}

function toTask(task: {
  id: string;
  title: string;
  description: string | null;
  area: string | null;
  ownerNames: string[];
  startsOn: Date | null;
  dueOn: Date | null;
  priority: FloorTaskDto["priority"];
  status: FloorTaskDto["status"];
  updatedAt: Date;
}): FloorTaskDto {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    area: task.area,
    ownerNames: task.ownerNames,
    startsOn: dateKey(task.startsOn),
    dueOn: dateKey(task.dueOn),
    priority: task.priority,
    status: task.status,
    updatedAt: task.updatedAt.toISOString(),
  };
}

function toExpense(expense: {
  id: string;
  title: string;
  notes: string | null;
  plannedCents: number | null;
  actualCents: number | null;
  spentOn: Date | null;
  updatedAt: Date;
}): FloorExpenseDto {
  return {
    id: expense.id,
    title: expense.title,
    notes: expense.notes,
    plannedCents: expense.plannedCents,
    actualCents: expense.actualCents,
    spentOn: dateKey(expense.spentOn),
    updatedAt: expense.updatedAt.toISOString(),
  };
}

export type { FloorProjectionDto };
