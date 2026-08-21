import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export type CampaignOverview = {
  total: number;
  treated: number;
  pending: number;
  followUp: number;
  interested: number;
  appointments: number;
  noInterest: number;
  notReached: number;
  completionPercent: number;
};

export function OverviewCards({
  campaignId,
  overview,
  overdueFollowUps,
  needsAction,
}: {
  campaignId: string;
  overview: CampaignOverview;
  overdueFollowUps: number;
  needsAction: number;
}) {
  const items = [
    { label: "Base total", value: overview.total, href: `/campaigns/${campaignId}/contacts?group=all` },
    { label: "Tratados", value: overview.treated, href: `/campaigns/${campaignId}/contacts?metric=treated` },
    { label: "Pendentes", value: overview.pending, href: `/campaigns/${campaignId}/contacts?metric=pending` },
    { label: "Em retorno", value: overview.followUp, href: `/campaigns/${campaignId}/contacts?metric=followUp` },
    { label: "Interessados", value: overview.interested, href: `/campaigns/${campaignId}/contacts?metric=interested` },
    { label: "Agendamentos", value: overview.appointments, href: `/campaigns/${campaignId}/contacts?metric=appointments` },
    { label: "Sem interesse", value: overview.noInterest, href: `/campaigns/${campaignId}/contacts?metric=noInterest` },
    { label: "Não localizados", value: overview.notReached, href: `/campaigns/${campaignId}/contacts?metric=notReached` },
  ];

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <CardContent className="flex flex-col gap-3 p-5">
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-medium">Progresso da campanha</p>
            <p className="text-sm font-semibold tabular-nums text-primary">{overview.completionPercent}%</p>
          </div>
          <Progress value={overview.completionPercent} className="h-2.5" />
          {needsAction > 0 && (
            <p className="text-xs text-temperature-hot">
              <Link href={`/campaigns/${campaignId}/contacts?group=action`} className="underline-offset-2 hover:underline">
                {needsAction} lead(s) precisam de ação
              </Link>
              {overdueFollowUps > 0 ? ` · ${overdueFollowUps} retorno(s) atrasado(s)` : ""}. Devolva à
              mesma fila ou redistribua.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map((item, index) => (
          <Card key={item.label} className={index === 0 ? "border-primary" : "transition-colors duration-200 hover:border-primary/40"}>
            <Link href={item.href} className="block">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className={`mt-1 text-2xl font-semibold tabular-nums ${index === 0 ? "text-primary" : ""}`}>
                {item.value.toLocaleString("pt-BR")}
              </p>
            </CardContent>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
