import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { isSupervisorOrAdmin } from "@/lib/permissions";
import { getCampaignOrThrow, listCampaignAgents, listEligibleAgentUsers } from "@/server/services/campaign";
import { ManageAgents } from "@/components/campaigns/manage-agents";
import { RedistributeAllButton } from "@/components/campaigns/redistribute-all-button";
import { CampaignSettingsForm } from "@/components/campaigns/campaign-settings-form";
import { ManageDispositions } from "@/components/campaigns/manage-dispositions";
import { listDispositionsForSettings } from "@/server/services/campaign-dispositions";

export default async function CampaignSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!isSupervisorOrAdmin(session!.user)) {
    redirect(`/campaigns/${id}/operation`);
  }

  const [campaign, agents, eligibleUsers, dispositions] = await Promise.all([
    getCampaignOrThrow(id),
    listCampaignAgents(id),
    listEligibleAgentUsers(),
    listDispositionsForSettings(id),
  ]);

  return (
    <div className="page-shell !max-w-4xl">
      <CampaignSettingsForm
        campaignId={id}
        name={campaign.name}
        description={campaign.description}
        status={campaign.status}
        type={campaign.type}
        startDate={campaign.startDate}
        endDate={campaign.endDate}
        agentCount={agents.filter((agent) => agent.active).length}
        sellersNotifyWebhookUrl={campaign.sellersNotifyWebhookUrl}
      />
      <div className="flex justify-end">
        <RedistributeAllButton campaignId={id} />
      </div>
      <ManageAgents campaignId={id} agents={agents} eligibleUsers={eligibleUsers} />
      <ManageDispositions
        campaignId={id}
        dispositions={dispositions}
        canEditGlobals={session!.user.role === "ADMIN"}
      />
    </div>
  );
}
