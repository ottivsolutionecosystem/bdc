import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-error";
import { isSupervisorOrAdmin, type SessionUser } from "@/lib/permissions";

/**
 * Garante que o usuário pode acessar a campanha informada.
 * ADMIN/SUPERVISOR sempre podem. AGENT só pode se estiver vinculado como
 * campaign_agent ativo daquela campanha — isso é a base do isolamento de
 * dados entre agentes (nunca confiar em filtros vindos do client).
 */
export async function assertCampaignAccess(
  user: SessionUser,
  campaignId: string
): Promise<void> {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { id: true } });
  if (!campaign) {
    throw new ApiError(404, "Campanha não encontrada");
  }

  if (isSupervisorOrAdmin(user)) return;

  if (user.role === "AGENT") {
    const membership = await prisma.campaignAgent.findUnique({
      where: { campaignId_userId: { campaignId, userId: user.id } },
      select: { active: true },
    });
    if (!membership?.active) {
      throw new ApiError(403, "Você não participa desta campanha");
    }
    return;
  }

  throw new ApiError(403, "Você não tem permissão para acessar esta campanha");
}

/**
 * Para rotas que retornam contatos: força o filtro por agente quando o
 * usuário é AGENT, ignorando qualquer agentId vindo de query params do
 * client — evita IDOR ao trocar id na URL.
 */
export function resolveEffectiveAgentFilter(
  user: SessionUser,
  requestedAgentId?: string | null
): string | undefined {
  if (user.role === "AGENT") return user.id;
  return requestedAgentId ?? undefined;
}
