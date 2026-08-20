import type { UserRole } from "@/generated/prisma/enums";
import { auth } from "@/lib/auth";
import { ApiError } from "@/lib/api-error";

export type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role: UserRole;
  active: boolean;
};

const SUPERVISOR_ROLES: UserRole[] = ["ADMIN", "SUPERVISOR"];

/**
 * Resolve o usuário autenticado a partir da sessão do servidor.
 * Lança ApiError(401) se não houver sessão válida ou o usuário estiver inativo.
 * Toda rota de API deve chamar isto antes de tocar em dados — nunca confiar
 * em ids/roles vindos do client.
 */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user || !session.user.active) {
    throw new ApiError(401, "Não autenticado");
  }
  return session.user;
}

export function requireRole(user: SessionUser, roles: UserRole[]): void {
  if (!roles.includes(user.role)) {
    throw new ApiError(403, "Você não tem permissão para executar esta ação");
  }
}

export function isSupervisorOrAdmin(user: SessionUser): boolean {
  return SUPERVISOR_ROLES.includes(user.role);
}

export function requireSupervisorOrAdmin(user: SessionUser): void {
  requireRole(user, SUPERVISOR_ROLES);
}

export function requireAdmin(user: SessionUser): void {
  requireRole(user, ["ADMIN"]);
}

export function requireSeller(user: SessionUser): void {
  requireRole(user, ["SELLER"]);
}

export function homePathForRole(role: UserRole): string {
  return role === "SELLER" ? "/sales" : "/campaigns";
}
