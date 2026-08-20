import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dispositionCategoryColorClass } from "@/lib/campaign-labels";
import type { DispositionCategory } from "@/generated/prisma/enums";

export type DispositionBreakdownItem = {
  dispositionId: string;
  label: string;
  category: DispositionCategory;
  count: number;
  percent: number;
};

export function DispositionBreakdown({
  campaignId,
  items,
}: {
  campaignId: string;
  items: DispositionBreakdownItem[];
}) {
  const max = Math.max(1, ...items.map((i) => i.count));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribuição por parecer</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 && <p className="text-sm text-muted-foreground">Nenhum parecer registrado ainda.</p>}
        {items.map((item) => {
          const widthPercent = Math.max(2, Math.round((item.count / max) * 100));
          return (
            <Link
              key={item.dispositionId}
              href={`/campaigns/${campaignId}/contacts?disposition=${item.dispositionId}`}
              className="block space-y-1 rounded-xl p-1.5 transition-colors hover:bg-accent"
            >
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-foreground">{item.label}</span>
                <span className="tabular-nums text-muted-foreground">
                  {item.count} ({item.percent}%)
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-2 rounded-full ${dispositionCategoryColorClass(item.category)}`}
                  style={{ width: `${widthPercent}%` }}
                />
              </div>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
