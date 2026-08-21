import { NextResponse, type NextRequest } from "next/server";

import { requireUser } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-error";
import { assertCampaignAccess, resolveEffectiveAgentFilter } from "@/server/services/campaign-access";
import { parseDispositionMetric } from "@/lib/disposition-metrics";
import { listContactsFiltered, type ContactListFilters } from "@/server/services/campaign-contacts-list";
import type { ContactStatus, ContactTemperature } from "@/generated/prisma/enums";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await params;
    await assertCampaignAccess(user, id);

    const search = request.nextUrl.searchParams;
    const groupParam = search.get("group");
    const filters: ContactListFilters = {
      group: groupParam === "treated" || groupParam === "action" || groupParam === "all" ? groupParam : "untreated",
      agentId: resolveEffectiveAgentFilter(user, search.get("agentId")),
      status: (search.get("status") as ContactStatus) || undefined,
      dispositionId: search.get("disposition") || undefined,
      temperature: (search.get("temperature") as ContactTemperature) || undefined,
      vehicle: search.get("vehicle") || undefined,
      search: search.get("q") || undefined,
      interested: search.get("interested") === "true",
      hasAppointment: search.get("hasAppointment") === "true",
      transferredToSales: search.get("transferredToSales") === "true",
      metric: parseDispositionMetric(search.get("metric")),
      attemptNumber: search.get("attempt") ? Number(search.get("attempt")) : undefined,
      periodStart: search.get("periodStart") || undefined,
      periodEnd: search.get("periodEnd") || undefined,
      page: search.get("page") ? Number(search.get("page")) : undefined,
    };

    const result = await listContactsFiltered(id, filters);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
