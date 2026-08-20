import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type FunnelStage = { stage: string; value: number };

export function FunnelChart({ stages }: { stages: FunnelStage[] }) {
  const max = Math.max(1, ...stages.map((s) => s.value));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Funil da campanha</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {stages.map((stage) => {
          const widthPercent = Math.max(2, Math.round((stage.value / max) * 100));
          return (
            <div key={stage.stage} className="space-y-1">
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-foreground">{stage.stage}</span>
                <span className="font-medium tabular-nums text-foreground">{stage.value.toLocaleString("pt-BR")}</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-2.5 rounded-full bg-primary transition-[width] duration-300"
                  style={{ width: `${widthPercent}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
