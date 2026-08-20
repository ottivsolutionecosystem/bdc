import { Card, CardContent } from "@/components/ui/card";

export type QueueStats = {
  assigned: number;
  treated: number;
  pending: number;
  interested: number;
  appointments: number;
  followUpsToday: number;
  overdueFollowUps: number;
  supervisorQueued: number;
};

export function QueueStatCards({ stats }: { stats: QueueStats }) {
  const items = [
    { label: "Minha base", value: stats.assigned },
    { label: "Tratados", value: stats.treated },
    { label: "Pendentes", value: stats.pending },
    { label: "Interessados", value: stats.interested },
    { label: "Agendamentos", value: stats.appointments },
    { label: "Retornos atrasados", value: stats.overdueFollowUps },
    { label: "Pedidos da supervisão", value: stats.supervisorQueued },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label} className="transition-colors duration-200 hover:border-primary/30">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{item.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
