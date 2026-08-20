import { auth } from "@/lib/auth";
import { isSupervisorOrAdmin } from "@/lib/permissions";
import { isCampaignOperable } from "@/lib/campaign-lifecycle";
import { getCampaignOrThrow } from "@/server/services/campaign";
import { getAgentQueueStats } from "@/server/services/campaign-operation";
import { listActiveDispositions, listSellers } from "@/server/services/campaign-dispositions";
import { campaignHasSellersNotifyWebhook } from "@/server/services/sellers-notify";
import { OperationPanel } from "@/components/campaigns/operation/operation-panel";
import { InactiveCampaignState } from "@/components/campaigns/operation/inactive-campaign-state";
import { Card, CardContent } from "@/components/ui/card";
import type { DispositionOption } from "@/types/campaign";

export default async function CampaignOperationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const user = session!.user;
  const campaign = await getCampaignOrThrow(id);
  const supervisor = isSupervisorOrAdmin(user);

  if (!isCampaignOperable(campaign.status)) {
    return <InactiveCampaignState campaignId={id} status={campaign.status} canManage={supervisor} />;
  }

  if (supervisor) {
    return (
      <div className="page-shell !max-w-3xl">
        <Card>
          <CardContent className="space-y-2 py-16 text-center">
            <p className="text-lg font-medium">A fila é das agentes</p>
            <p className="text-sm text-muted-foreground">
              Acompanhe o dashboard e, em Contatos, a aba Precisa de ação: devolva o lead à mesma fila
              ou redistribua. A ligação fica com as agentes.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [stats, dispositions, sellers] = await Promise.all([
    getAgentQueueStats(user.id, id),
    listActiveDispositions(id),
    listSellers(),
  ]);

  const dispositionOptions: DispositionOption[] = dispositions.map((d) => ({
    id: d.id,
    code: d.code,
    label: d.label,
    category: d.category,
    requiresNextContact: d.requiresNextContact,
  }));

  return (
    <OperationPanel
      campaignId={id}
      initialStats={stats}
      dispositions={dispositionOptions}
      sellers={sellers}
      sellersNotifyEnabled={campaignHasSellersNotifyWebhook(campaign.sellersNotifyWebhookUrl)}
    />
  );
}
