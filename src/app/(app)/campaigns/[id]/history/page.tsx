import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { isSupervisorOrAdmin } from "@/lib/permissions";
import {
  listCampaignAssignmentHistory,
  listCampaignAuditLogs,
  listCampaignTransfers,
} from "@/server/services/campaign-history";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ASSIGNMENT_REASON_LABELS, AUDIT_ACTION_LABELS } from "@/lib/campaign-labels";
import { ExportCsvLink } from "@/components/export-csv-link";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

export default async function CampaignHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!isSupervisorOrAdmin(session!.user)) {
    redirect(`/campaigns/${id}/operation`);
  }

  const [auditLogs, transfers, assignments] = await Promise.all([
    listCampaignAuditLogs(id),
    listCampaignTransfers(id),
    listCampaignAssignmentHistory(id),
  ]);

  return (
    <div className="page-shell">
      <div className="flex justify-end">
        <ExportCsvLink href={`/api/campaigns/${id}/export?kind=history`} label="Exportar histórico" />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Auditoria</CardTitle>
        </CardHeader>
        <CardContent>
          {auditLogs.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhum evento registrado ainda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quando</TableHead>
                  <TableHead>Quem</TableHead>
                  <TableHead>Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{dateFormatter.format(item.createdAt)}</TableCell>
                    <TableCell>{item.user.name}</TableCell>
                    <TableCell>{AUDIT_ACTION_LABELS[item.action] ?? item.action}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transferências para vendas</CardTitle>
        </CardHeader>
        <CardContent>
          {transfers.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma transferência ainda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quando</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Agente</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Parecer</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{dateFormatter.format(item.createdAt)}</TableCell>
                    <TableCell>{item.contact.name}</TableCell>
                    <TableCell>{item.agent.name}</TableCell>
                    <TableCell>{item.seller.name}</TableCell>
                    <TableCell>{item.disposition?.label ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Redistribuições</CardTitle>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma movimentação de base ainda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quando</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>De</TableHead>
                  <TableHead>Para</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Por</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{dateFormatter.format(item.createdAt)}</TableCell>
                    <TableCell>{item.contact.name}</TableCell>
                    <TableCell>{item.fromAgent?.name ?? "—"}</TableCell>
                    <TableCell>{item.toAgent?.name ?? "—"}</TableCell>
                    <TableCell>{ASSIGNMENT_REASON_LABELS[item.reason]}</TableCell>
                    <TableCell>{item.changedBy.name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
