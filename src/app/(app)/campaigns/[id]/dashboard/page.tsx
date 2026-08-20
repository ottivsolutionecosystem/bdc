import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { isSupervisorOrAdmin } from "@/lib/permissions";
import {
  getAgentPerformance,
  getCampaignFunnel,
  getCampaignOverview,
  getDispositionBreakdown,
  getNeedsActionCount,
  getOverdueFollowUpsCount,
} from "@/server/services/campaign-metrics";
import { OverviewCards } from "@/components/campaigns/dashboard/overview-cards";
import { FunnelChart } from "@/components/campaigns/dashboard/funnel-chart";
import { DispositionBreakdown } from "@/components/campaigns/dashboard/disposition-breakdown";
import { AgentPerformanceTable } from "@/components/campaigns/dashboard/agent-performance-table";
import { RankingList } from "@/components/campaigns/dashboard/ranking-list";
import { ExportCsvLink } from "@/components/export-csv-link";
import { Button } from "@/components/ui/button";

export default async function CampaignDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!isSupervisorOrAdmin(session!.user)) {
    redirect(`/campaigns/${id}/operation`);
  }

  const [overview, overdueFollowUps, needsAction, funnel, dispositionBreakdown, agentPerformance] = await Promise.all([
    getCampaignOverview(id),
    getOverdueFollowUpsCount(id),
    getNeedsActionCount(id),
    getCampaignFunnel(id),
    getDispositionBreakdown(id),
    getAgentPerformance(id),
  ]);

  return (
    <div className="page-shell">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button asChild variant="outline">
          <Link href={`/campaigns/${id}/ranking?tv=1`}>Espelhar ranking</Link>
        </Button>
        <ExportCsvLink href={`/api/campaigns/${id}/export?kind=dashboard`} label="Exportar dashboard" />
      </div>
      <OverviewCards
        campaignId={id}
        overview={overview}
        overdueFollowUps={overdueFollowUps}
        needsAction={needsAction}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <FunnelChart stages={funnel} />
        <DispositionBreakdown campaignId={id} items={dispositionBreakdown} />
      </div>

      <AgentPerformanceTable rows={agentPerformance} />

      <RankingList
        campaignId={id}
        entries={agentPerformance.map((row) => ({ agentId: row.agentId, agentName: row.agentName, score: row.score }))}
      />
    </div>
  );
}
