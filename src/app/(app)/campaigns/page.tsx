import Link from "next/link";
import { redirect } from "next/navigation";
import { Users, PhoneCall } from "lucide-react";

import { auth } from "@/lib/auth";
import { homePathForRole, isSupervisorOrAdmin } from "@/lib/permissions";
import { listCampaignsForUser } from "@/server/services/campaign";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CampaignStatusBadge } from "@/components/campaigns/status-badge";
import { CreateCampaignDialog } from "@/components/campaigns/create-campaign-dialog";
import { campaignTypeLabel } from "@/lib/campaign-labels";
import { campaignEntryPath } from "@/lib/campaign-lifecycle";
import { PageHeader } from "@/components/layout/page-header";

export default async function CampaignsPage() {
  const session = await auth();
  const user = session!.user;
  if (user.role === "SELLER") {
    redirect(homePathForRole(user.role));
  }
  const campaigns = await listCampaignsForUser(user);
  const canCreate = isSupervisorOrAdmin(user);

  return (
    <div className="page-shell">
      <PageHeader
        title="Campanhas"
        description={canCreate ? "Todas as campanhas de ligação." : "Campanhas em que você participa."}
        actions={canCreate ? <CreateCampaignDialog /> : undefined}
      />

      {campaigns.length === 0 ? (
        <Card className="overflow-hidden">
          <div className="h-1 bg-primary" />
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-primary/15 text-primary">
              <PhoneCall className="size-7" />
            </div>
            <p className="font-medium">Nenhuma campanha ainda</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              {canCreate
                ? "Crie sua primeira campanha para começar a importar contatos e distribuir para as agentes."
                : "Você ainda não foi adicionada a nenhuma campanha. Fale com seu supervisor."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {campaigns.map((campaign) => (
            <Link
              key={campaign.id}
              href={campaignEntryPath(campaign.id, campaign.status, user.role)}
              className="group block rounded-2xl focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
            >
              <Card className="h-full overflow-hidden transition-all duration-300 group-hover:-translate-y-0.5 group-hover:border-primary/50 group-hover:shadow-md">
                <div className="h-1 bg-primary opacity-80 transition-opacity group-hover:opacity-100" />
                <CardHeader className="flex flex-row items-start justify-between gap-2">
                  <CardTitle className="text-base">{campaign.name}</CardTitle>
                  <CampaignStatusBadge status={campaign.status} />
                </CardHeader>
                <CardContent className="space-y-3">
                  {campaign.description && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">{campaign.description}</p>
                  )}
                  <p className="text-xs font-medium tracking-wide text-primary/90 uppercase">
                    {campaignTypeLabel(campaign.type)}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <PhoneCall className="size-3.5" />
                      {campaign._count.contacts} contatos
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="size-3.5" />
                      {campaign._count.agents} agentes
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
