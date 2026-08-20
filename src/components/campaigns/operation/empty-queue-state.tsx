import { PartyPopper } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { QueueStats } from "@/components/campaigns/operation/queue-stat-cards";

export function EmptyQueueState({ stats }: { stats: QueueStats }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
        <PartyPopper className="size-10 text-status-treated" />
        <div>
          <p className="text-lg font-medium">Parabéns. Você concluiu sua fila atual.</p>
          <p className="text-sm text-muted-foreground">
            {stats.supervisorQueued > 0
              ? `Há ${stats.supervisorQueued} pedido(s) da supervisão com horário futuro. Eles entram na fila na hora combinada.`
              : stats.followUpsToday > 0
                ? `Você ainda tem ${stats.followUpsToday} retorno(s) marcado(s) para hoje. Eles entram na fila no horário combinado.`
                : "Não há retornos vencidos nem contatos pendentes agora. Volte mais tarde ou aguarde novos retornos."}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 pt-2 sm:gap-6">
          <div>
            <p className="text-2xl font-semibold tabular-nums">{stats.treated}</p>
            <p className="text-xs text-muted-foreground">Tratados</p>
          </div>
          <div>
            <p className="text-2xl font-semibold tabular-nums">{stats.interested}</p>
            <p className="text-xs text-muted-foreground">Interessados</p>
          </div>
          <div>
            <p className="text-2xl font-semibold tabular-nums">{stats.appointments}</p>
            <p className="text-xs text-muted-foreground">Agendamentos</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
