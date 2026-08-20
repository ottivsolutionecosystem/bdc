import type { CampaignStatus, UserRole } from "@/generated/prisma/enums";
import { ApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";

export function isCampaignOperable(status: CampaignStatus): boolean {
  return status === "ACTIVE";
}

export function campaignAcceptsSetup(status: CampaignStatus): boolean {
  return status === "DRAFT" || status === "ACTIVE" || status === "PAUSED";
}

export function campaignOperationBlockMessage(status: CampaignStatus): string {
  switch (status) {
    case "DRAFT":
      return "A campanha ainda está em rascunho. Ative-a em Configurações para começar as ligações.";
    case "PAUSED":
      return "A campanha está pausada. Reative-a em Configurações para retomar as ligações.";
    case "COMPLETED":
      return "A campanha foi concluída e não aceita novas ligações.";
    case "CANCELED":
      return "A campanha foi cancelada e não aceita novas ligações.";
    default:
      return "A campanha não está ativa.";
  }
}

export function assertCampaignAcceptsSetup(status: CampaignStatus): void {
  if (!campaignAcceptsSetup(status)) {
    throw new ApiError(409, "Esta campanha está encerrada e não pode ser alterada.");
  }
}

export async function assertCampaignOperable(campaignId: string): Promise<void> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { status: true },
  });
  if (!campaign) throw new ApiError(404, "Campanha não encontrada");
  if (!isCampaignOperable(campaign.status)) {
    throw new ApiError(409, campaignOperationBlockMessage(campaign.status));
  }
}

export function campaignEntryPath(campaignId: string, status: CampaignStatus, role: UserRole): string {
  if (role === "AGENT") return `/campaigns/${campaignId}/operation`;
  if (status === "DRAFT" || status === "PAUSED") return `/campaigns/${campaignId}/settings`;
  return `/campaigns/${campaignId}/dashboard`;
}
