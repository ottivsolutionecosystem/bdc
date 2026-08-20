import { NextResponse, type NextRequest } from "next/server";

import { requireUser, requireSupervisorOrAdmin } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-error";
import { listCampaignImports } from "@/server/services/campaign-import";
import { assertCampaignAccess } from "@/server/services/campaign-access";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await params;
    await assertCampaignAccess(user, id);
    requireSupervisorOrAdmin(user);
    const imports = await listCampaignImports(id);
    return NextResponse.json({ imports });
  } catch (error) {
    return handleApiError(error);
  }
}
