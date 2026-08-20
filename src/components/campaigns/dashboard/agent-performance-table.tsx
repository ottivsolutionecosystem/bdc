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
        <div className="overflow-x-auto">
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
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={14} className="text-center text-muted-foreground">
                    Nenhuma agente nesta campanha ainda.
                  </TableCell>
                </TableRow>
              )}
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
      </CardContent>
    </Card>
  );
}
