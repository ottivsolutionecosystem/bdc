import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { auth } from "@/lib/auth";
import { isSupervisorOrAdmin } from "@/lib/permissions";
import { ApiError } from "@/lib/api-error";
import { assertCampaignAccess } from "@/server/services/campaign-access";
import { getCampaignOrThrow } from "@/server/services/campaign";
import { CampaignStatusBadge } from "@/components/campaigns/status-badge";
import { CampaignNav, type CampaignNavItem } from "@/components/campaigns/campaign-nav";

export default async function CampaignLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const user = session!.user;
  const { id } = await params;

  let campaign;
  try {
    await assertCampaignAccess(user, id);
    campaign = await getCampaignOrThrow(id);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) {
      notFound();
    }
    throw error;
  }

  const supervisor = isSupervisorOrAdmin(user);

  const items: CampaignNavItem[] = supervisor
    ? [
        { href: "dashboard", label: "Dashboard" },
        { href: "ranking", label: "Ranking" },
        { href: "contacts", label: "Contatos" },
        { href: "import", label: "Importar" },
        { href: "settings", label: "Configurações" },
        { href: "history", label: "Histórico" },
        { href: "operation", label: "Operação" },
      ]
    : [
        { href: "operation", label: "Operação" },
        { href: "ranking", label: "Ranking" },
      ];

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-6xl px-4 pt-5 sm:px-6 sm:pt-8">
        <Link
          href="/campaigns"
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Campanhas
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{campaign.name}</h1>
          <CampaignStatusBadge status={campaign.status} />
        </div>
      </div>
      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-30 mt-4 border-b border-border bg-background/90 py-2 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <CampaignNav campaignId={id} items={items} />
        </div>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}
