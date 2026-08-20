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
  transferred: number;
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
    { label: "Base total", value: overview.total },
    { label: "Tratados", value: overview.treated },
    { label: "Pendentes", value: overview.pending },
    { label: "Em retorno", value: overview.followUp },
    { label: "Interessados", value: overview.interested },
    { label: "Agendamentos", value: overview.appointments },
    { label: "Encaminhados para vendas", value: overview.transferred },
    { label: "Não localizados", value: overview.notReached },
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
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className={`mt-1 text-2xl font-semibold tabular-nums ${index === 0 ? "text-primary" : ""}`}>
                {item.value.toLocaleString("pt-BR")}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
