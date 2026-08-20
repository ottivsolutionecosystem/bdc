import Link from "next/link";
import { PauseCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CampaignStatusBadge } from "@/components/campaigns/status-badge";
import { campaignOperationBlockMessage } from "@/lib/campaign-lifecycle";
import type { CampaignStatus } from "@/generated/prisma/enums";

export function InactiveCampaignState({
  campaignId,
  status,
  canManage,
}: {
  campaignId: string;
  status: CampaignStatus;
  canManage: boolean;
}) {
  return (
    <div className="page-shell !max-w-3xl">
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
          <PauseCircle className="size-10 text-muted-foreground" />
          <CampaignStatusBadge status={status} />
          <div className="space-y-1">
            <p className="text-lg font-medium">Fila indisponível</p>
            <p className="max-w-md text-sm text-muted-foreground">{campaignOperationBlockMessage(status)}</p>
          </div>
          {canManage && (
            <Button asChild>
              <Link href={`/campaigns/${campaignId}/settings`}>Ir para configurações</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
