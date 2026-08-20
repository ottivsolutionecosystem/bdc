import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { homePathForRole } from "@/lib/permissions";
import { listSellerAppointments, listSellerOpportunities } from "@/server/services/sales";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { APPOINTMENT_STATUS_LABELS, OPPORTUNITY_STATUS_LABELS } from "@/lib/campaign-labels";
import { SalesStatusSelect } from "@/components/sales/sales-status-select";
import { SalesNotesField } from "@/components/sales/sales-notes-field";
import { CreateAppointmentDialog, SalesAgendaCalendar } from "@/components/sales/sales-agenda";
import { PageHeader } from "@/components/layout/page-header";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

export default async function SalesPage() {
  const session = await auth();
  const user = session!.user;
  if (user.role !== "SELLER") {
    redirect(homePathForRole(user.role));
  }

  const [opportunities, appointments] = await Promise.all([
    listSellerOpportunities(user),
    listSellerAppointments(user),
  ]);

  const funnel = {
    open: opportunities.filter((item) => item.status === "OPEN").length,
    won: opportunities.filter((item) => item.status === "WON").length,
    lost: opportunities.filter((item) => item.status === "LOST").length,
  };
  const uniqueCustomers = Array.from(
    new Map(opportunities.map((item) => [item.customer.id, { id: item.customer.id, name: item.customer.name }])).values()
  );

  return (
    <div className="page-shell">
      <PageHeader
        title="Vendas"
        description="Oportunidades e visitas originadas das campanhas de ligação."
        actions={<CreateAppointmentDialog customers={uniqueCustomers} />}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="overflow-hidden">
          <div className="h-1 bg-primary" />
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Em negociação</p>
            <p className="text-2xl font-semibold tabular-nums">{funnel.open}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Ganhas</p>
            <p className="text-2xl font-semibold tabular-nums">{funnel.won}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Perdidas</p>
            <p className="text-2xl font-semibold tabular-nums">{funnel.lost}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Oportunidades</CardTitle>
        </CardHeader>
        <CardContent>
          {opportunities.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma oportunidade encaminhada ainda.
            </p>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {opportunities.map((item) => (
                  <div key={item.id} className="space-y-3 rounded-xl border border-border p-4">
                    <div>
                      <p className="font-medium">{item.customer.name}</p>
                      <p className="text-sm text-muted-foreground">{item.customer.phone}</p>
                    </div>
                    <p className="text-sm">{item.originCampaign?.name ?? "—"}</p>
                    <SalesStatusSelect
                      endpoint={`/api/sales/opportunities/${item.id}`}
                      value={item.status}
                      options={OPPORTUNITY_STATUS_LABELS}
                    />
                    <SalesNotesField endpoint={`/api/sales/opportunities/${item.id}`} value={item.notes} />
                    <p className="text-xs text-muted-foreground">{dateFormatter.format(item.createdAt)}</p>
                  </div>
                ))}
              </div>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Campanha</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Observação</TableHead>
                      <TableHead>Criada em</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {opportunities.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.customer.name}</TableCell>
                        <TableCell>{item.customer.phone}</TableCell>
                        <TableCell>{item.originCampaign?.name ?? "—"}</TableCell>
                        <TableCell>
                          <SalesStatusSelect
                            endpoint={`/api/sales/opportunities/${item.id}`}
                            value={item.status}
                            options={OPPORTUNITY_STATUS_LABELS}
                          />
                        </TableCell>
                        <TableCell className="min-w-56">
                          <SalesNotesField endpoint={`/api/sales/opportunities/${item.id}`} value={item.notes} />
                        </TableCell>
                        <TableCell>{dateFormatter.format(item.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <SalesAgendaCalendar appointments={appointments} />

      <Card>
        <CardHeader>
          <CardTitle>Agenda</CardTitle>
        </CardHeader>
        <CardContent>
          {appointments.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma visita agendada ainda.</p>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {appointments.map((item) => (
                  <div key={item.id} className="space-y-3 rounded-xl border border-border p-4">
                    <div>
                      <p className="font-medium">{item.customer.name}</p>
                      <p className="text-sm text-muted-foreground">{item.customer.phone}</p>
                    </div>
                    <p className="text-sm">{item.originCampaignContact?.campaign.name ?? "—"}</p>
                    <p className="text-sm tabular-nums">{dateFormatter.format(item.scheduledAt)}</p>
                    <SalesStatusSelect
                      endpoint={`/api/sales/appointments/${item.id}`}
                      value={item.status}
                      options={APPOINTMENT_STATUS_LABELS}
                    />
                    <SalesNotesField endpoint={`/api/sales/appointments/${item.id}`} value={item.notes} />
                  </div>
                ))}
              </div>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Campanha</TableHead>
                      <TableHead>Quando</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Observação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {appointments.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.customer.name}</TableCell>
                        <TableCell>{item.customer.phone}</TableCell>
                        <TableCell>{item.originCampaignContact?.campaign.name ?? "—"}</TableCell>
                        <TableCell>{dateFormatter.format(item.scheduledAt)}</TableCell>
                        <TableCell>
                          <SalesStatusSelect
                            endpoint={`/api/sales/appointments/${item.id}`}
                            value={item.status}
                            options={APPOINTMENT_STATUS_LABELS}
                          />
                        </TableCell>
                        <TableCell className="min-w-56">
                          <SalesNotesField endpoint={`/api/sales/appointments/${item.id}`} value={item.notes} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
