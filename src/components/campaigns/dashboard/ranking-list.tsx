import { Trophy } from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type RankingEntry = { agentId: string; agentName: string; score: number };

export function RankingList({ campaignId, entries }: { campaignId: string; entries: RankingEntry[] }) {
  const sorted = [...entries].sort((a, b) => b.score - a.score);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Trophy className="size-4" />
          Ranking de performance
        </CardTitle>
        <Link href={`/campaigns/${campaignId}/ranking`} className="text-sm font-medium text-primary hover:underline">
          Abrir painel
        </Link>
      </CardHeader>
      <CardContent className="space-y-1">
        {sorted.length === 0 && <p className="text-sm text-muted-foreground">Sem dados ainda.</p>}
        {sorted.map((entry, index) => (
          <div
            key={entry.agentId}
            className={cn(
              "flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors",
              index === 0 && "bg-accent font-medium text-primary"
            )}
          >
            <span>
              {index + 1}º {entry.agentName}
            </span>
            <span className="tabular-nums">{entry.score} pontos</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
