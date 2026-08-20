import { type NextRequest } from "next/server";

import { requireUser, requireSupervisorOrAdmin } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-error";
import { assertCampaignAccess } from "@/server/services/campaign-access";
import { csvFileResponse } from "@/lib/csv";
import {
  exportCampaignContactsCsv,
  exportCampaignDashboardCsv,
  exportCampaignHistoryCsv,
} from "@/server/services/campaign-export";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser();
    requireSupervisorOrAdmin(user);
    const { id } = await params;
    await assertCampaignAccess(user, id);

    const kind = request.nextUrl.searchParams.get("kind") ?? "contacts";
    if (kind === "history") {
      const csv = await exportCampaignHistoryCsv(id);
      return csvFileResponse("historico-campanha.csv", csv);
    }
    if (kind === "dashboard") {
      const csv = await exportCampaignDashboardCsv(id);
      return csvFileResponse("dashboard-campanha.csv", csv);
    }
    const csv = await exportCampaignContactsCsv(id);
    return csvFileResponse("contatos-campanha.csv", csv);
  } catch (error) {
    return handleApiError(error);
  }
}
