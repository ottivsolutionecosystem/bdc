import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type AgentPerformanceRow = {
  agentId: string;
  agentName: string;
  assigned: number;
  treated: number;
  pending: number;
  attempts: number;
  successfulContacts: number;
  interested: number;
  appointments: number;
  transferred: number;
  treatmentRate: number;
  contactRate: number;
  interestRate: number;
  appointmentRate: number;
  transferRate: number;
  score: number;
};

export function AgentPerformanceTable({ rows }: { rows: AgentPerformanceRow[] }) {
  const sorted = [...rows].sort((a, b) => b.score - a.score);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance por agente</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">Nenhuma agente nesta campanha ainda.</p>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {sorted.map((row) => (
                <div key={row.agentId} className="rounded-xl border border-border p-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-medium">{row.agentName}</p>
                    <p className="text-lg font-semibold tabular-nums text-primary">{row.score} pts</p>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <dt className="text-muted-foreground">Base</dt>
                      <dd className="tabular-nums">{row.assigned}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Tratados</dt>
                      <dd className="tabular-nums">{row.treated}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Pendentes</dt>
                      <dd className="tabular-nums">{row.pending}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Contatos</dt>
                      <dd className="tabular-nums">{row.successfulContacts}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Interessados</dt>
                      <dd className="tabular-nums">{row.interested}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Visitas</dt>
                      <dd className="tabular-nums">{row.appointments}</dd>
                    </div>
                  </dl>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Tratamento {row.treatmentRate}% · contato {row.contactRate}% · interesse {row.interestRate}%
                  </p>
                </div>
              ))}
            </div>
            <div className="hidden md:block">
              <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agente</TableHead>
                <TableHead className="text-right">Pontos</TableHead>
                <TableHead className="text-right">Base</TableHead>
                <TableHead className="text-right">Tratados</TableHead>
                <TableHead className="text-right">Pendentes</TableHead>
                <TableHead className="text-right">Tentativas</TableHead>
                <TableHead className="text-right">Contatos efetivos</TableHead>
                <TableHead className="text-right">Interessados</TableHead>
                <TableHead className="text-right">Agendamentos</TableHead>
                <TableHead className="text-right">Transferências</TableHead>
                <TableHead className="text-right">Taxa tratamento</TableHead>
                <TableHead className="text-right">Taxa contato</TableHead>
                <TableHead className="text-right">Taxa interesse</TableHead>
                <TableHead className="text-right">Taxa agendamento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((row) => (
                <TableRow key={row.agentId}>
                  <TableCell className="font-medium">{row.agentName}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">{row.score}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.assigned}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.treated}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.pending}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.attempts}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.successfulContacts}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.interested}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.appointments}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.transferred}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.treatmentRate}%</TableCell>
                  <TableCell className="text-right tabular-nums">{row.contactRate}%</TableCell>
                  <TableCell className="text-right tabular-nums">{row.interestRate}%</TableCell>
                  <TableCell className="text-right tabular-nums">{row.appointmentRate}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
