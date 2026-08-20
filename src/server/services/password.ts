import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-error";
import { recordAudit } from "@/server/services/audit";
import type { SessionUser } from "@/lib/permissions";

const RESET_TTL_MS = 60 * 60 * 1000;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function resetLinksEnabled() {
  return process.env.AUTH_DEV_RESET_LINKS === "true";
}

export async function requestPasswordReset(email: string, origin: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || !user.active) {
    return { ok: true as const, resetUrl: undefined };
  }

  const token = randomBytes(32).toString("hex");
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetTokenHash: hashToken(token),
      passwordResetExpiresAt: new Date(Date.now() + RESET_TTL_MS),
    },
  });

  const resetUrl = `${origin}/reset-password?token=${token}`;
  return { ok: true as const, resetUrl: resetLinksEnabled() ? resetUrl : undefined };
}

export async function resetPasswordWithToken(token: string, password: string) {
  const tokenHash = hashToken(token);
  const user = await prisma.user.findFirst({
    where: {
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { gt: new Date() },
      active: true,
    },
  });
  if (!user) throw new ApiError(422, "Link inválido ou expirado. Solicite um novo.");

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null,
    },
  });
}

export async function changeOwnPassword(user: SessionUser, currentPassword: string, nextPassword: string) {
  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) throw new ApiError(404, "Usuário não encontrado");

  const valid = await bcrypt.compare(currentPassword, dbUser.passwordHash);
  if (!valid) throw new ApiError(422, "Senha atual incorreta");

  const passwordHash = await bcrypt.hash(nextPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, passwordResetTokenHash: null, passwordResetExpiresAt: null },
  });
  await recordAudit(prisma, {
    userId: user.id,
    entityType: "User",
    entityId: user.id,
    action: "PASSWORD_CHANGED",
  });
}
