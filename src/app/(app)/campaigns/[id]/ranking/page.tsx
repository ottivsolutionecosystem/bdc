import { auth } from "@/lib/auth";
import { assertCampaignAccess } from "@/server/services/campaign-access";
import { getCampaignRanking } from "@/server/services/campaign-metrics";
import { RankingBoard } from "@/components/campaigns/ranking/ranking-board";

export default async function CampaignRankingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const session = await auth();
  await assertCampaignAccess(session!.user, id);
  const ranking = await getCampaignRanking(id);
  const tv = (await searchParams).tv === "1";

  return (
    <div className={tv ? "" : "page-shell !max-w-5xl"}>
      <RankingBoard campaignId={id} initial={ranking} viewerUserId={session!.user.id} tv={tv} />
    </div>
  );
}
