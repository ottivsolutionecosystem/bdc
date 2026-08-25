import { NextResponse, type NextRequest } from "next/server";

import { requireUser } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-error";
import { assertCampaignAccess } from "@/server/services/campaign-access";
import { findIncomingContactForAgent } from "@/server/services/campaign-incoming";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await params;
    await assertCampaignAccess(user, id);
    const phone = request.nextUrl.searchParams.get("phone") ?? "";
    const contact = await findIncomingContactForAgent(user, id, phone);
    return NextResponse.json({ contact });
  } catch (error) {
    return handleApiError(error);
  }
}
