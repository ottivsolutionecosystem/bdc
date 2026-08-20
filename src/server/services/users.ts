import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-error";
import { requireAdmin, type SessionUser } from "@/lib/permissions";
import { recordAudit } from "@/server/services/audit";
import type { CreateUserInput, UpdateUserInput } from "@/schemas/user";

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  active: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function listUsers(actor: SessionUser) {
  requireAdmin(actor);
  return prisma.user.findMany({
    select: publicUserSelect,
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });
}

export async function createUser(actor: SessionUser, input: CreateUserInput) {
  requireAdmin(actor);

  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new ApiError(409, "Já existe um usuário com este e-mail");
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const created = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role,
      active: input.active ?? true,
    },
    select: publicUserSelect,
  });

  await recordAudit(prisma, {
    userId: actor.id,
    entityType: "User",
    entityId: created.id,
    action: "USER_CREATED",
    metadata: { role: created.role, email: created.email },
  });

  return created;
}

export async function updateUser(actor: SessionUser, userId: string, input: UpdateUserInput) {
  requireAdmin(actor);

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) throw new ApiError(404, "Usuário não encontrado");

  if (target.id === actor.id && input.active === false) {
    throw new ApiError(422, "Você não pode desativar o próprio acesso");
  }
  if (target.id === actor.id && input.role && input.role !== target.role) {
    throw new ApiError(422, "Você não pode alterar o próprio papel");
  }

  if (input.email && input.email !== target.email) {
    const clash = await prisma.user.findUnique({ where: { email: input.email } });
    if (clash) throw new ApiError(409, "Já existe um usuário com este e-mail");
  }

  const passwordHash =
    input.password && input.password.length > 0 ? await bcrypt.hash(input.password, 10) : undefined;

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      name: input.name,
      email: input.email,
      role: input.role,
      active: input.active,
      passwordHash,
    },
    select: publicUserSelect,
  });

  await recordAudit(prisma, {
    userId: actor.id,
    entityType: "User",
    entityId: userId,
    action: "USER_UPDATED",
    metadata: { role: updated.role, active: updated.active },
  });

  return updated;
}
