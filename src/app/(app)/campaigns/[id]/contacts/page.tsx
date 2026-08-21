import { redirect } from "next/navigation";
import Link from "next/link";

import { auth } from "@/lib/auth";
import { isSupervisorOrAdmin } from "@/lib/permissions";
import {
  countActionableContacts,
  listContactsFiltered,
  type ContactListFilters,
  type ContactListGroup,
} from "@/server/services/campaign-contacts-list";
import { listCampaignAgents } from "@/server/services/campaign";
import { listActiveDispositions } from "@/server/services/campaign-dispositions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ContactsFilterBar } from "@/components/campaigns/contacts/contacts-filter-bar";
import { ContactsWorkbench } from "@/components/campaigns/contacts/contacts-workbench";
import { ExportCsvLink } from "@/components/export-csv-link";
import { parseDispositionMetric } from "@/lib/disposition-metrics";
import type { ContactStatus, ContactTemperature } from "@/generated/prisma/enums";

function parseGroup(value: string | undefined): ContactListGroup {
  if (value === "treated" || value === "untreated" || value === "all") return value;
  return "action";
}

export default async function CampaignContactsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!isSupervisorOrAdmin(session!.user)) {
    redirect(`/campaigns/${id}/operation`);
  }

  const sp = await searchParams;
  const metric = parseDispositionMetric(sp.metric);
  const group = metric ? "all" : parseGroup(sp.group);

  const filters: ContactListFilters = {
    group,
    metric,
    agentId: sp.agentId,
    status: sp.status as ContactStatus | undefined,
    dispositionId: sp.disposition,
    temperature: sp.temperature as ContactTemperature | undefined,
    vehicle: sp.vehicle,
    search: sp.q,
    interested: sp.interested === "true",
    hasAppointment: sp.hasAppointment === "true",
    transferredToSales: sp.transferredToSales === "true",
    page: sp.page ? Number(sp.page) : undefined,
  };

  const [{ contacts, total, page, totalPages }, campaignAgents, dispositions, needsAction] = await Promise.all([
    listContactsFiltered(id, filters),
    listCampaignAgents(id),
    listActiveDispositions(id),
    countActionableContacts(id),
  ]);

  const workbenchGroup: ContactListGroup = !metric
    ? group
    : metric === "pending" || metric === "followUp"
      ? "untreated"
      : "treated";

  const activeAgents = campaignAgents.filter((a) => a.active).map((a) => ({ id: a.user.id, name: a.user.name }));

  function buildTabHref(nextGroup: string) {
    const params = new URLSearchParams();
    for (const key of [
      "q",
      "agentId",
      "status",
      "disposition",
      "temperature",
      "interested",
      "hasAppointment",
      "transferredToSales",
    ] as const) {
      const value = sp[key];
      if (value) params.set(key, value);
    }
    params.set("group", nextGroup);
    return `?${params.toString()}`;
  }

  return (
    <div className="page-shell">
      <Tabs value={group}>
        <TabsList>
          <TabsTrigger value="all" asChild>
            <Link href={buildTabHref("all")}>Todos</Link>
          </TabsTrigger>
          <TabsTrigger value="action" asChild>
            <Link href={buildTabHref("action")}>Precisa de ação{needsAction > 0 ? ` (${needsAction})` : ""}</Link>
          </TabsTrigger>
          <TabsTrigger value="untreated" asChild>
            <Link href={buildTabHref("untreated")}>Na fila</Link>
          </TabsTrigger>
          <TabsTrigger value="treated" asChild>
            <Link href={buildTabHref("treated")}>Encerrados</Link>
          </TabsTrigger>
        </TabsList>
        <TabsContent value={group} />
      </Tabs>

      {metric && (
        <p className="text-sm text-muted-foreground">
          Lista filtrada pelo mesmo critério do card do dashboard. O total desta página tem que bater com o
          número do card.
        </p>
      )}

      {group === "action" && !metric && (
        <p className="text-sm text-muted-foreground">
          Retornos atrasados e não localizados. Devolva para a mesma agente ou mande para outra fila — o
          lead não pode ficar parado sem dono.
        </p>
      )}

      <ContactsFilterBar
        agents={activeAgents}
        dispositions={dispositions.map((d) => ({ id: d.id, label: d.label }))}
      />

      <p className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{total} contato(s) encontrado(s)</span>
        <ExportCsvLink href={`/api/campaigns/${id}/export?kind=contacts`} />
      </p>

      <ContactsWorkbench
        campaignId={id}
        group={workbenchGroup}
        contacts={contacts}
        eligibleAgents={activeAgents}
        dispositions={dispositions.map((d) => ({ id: d.id, label: d.label, category: d.category }))}
      />

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
            const pageParams = new URLSearchParams();
            Object.entries(sp).forEach(([key, value]) => {
              if (value) pageParams.set(key, value);
            });
            pageParams.set("group", group);
            pageParams.set("page", String(p));
            return (
              <Button key={p} variant={p === page ? "default" : "outline"} size="sm" asChild>
                <Link href={`?${pageParams.toString()}`}>{p}</Link>
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}
