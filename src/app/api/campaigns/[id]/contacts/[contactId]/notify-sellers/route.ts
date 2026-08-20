import { NextResponse, type NextRequest } from "next/server";

import { requireUser } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-error";
import { notifySellersGroupSchema } from "@/schemas/attempt";
import { assertCampaignAccess } from "@/server/services/campaign-access";
import { notifySellersGroup } from "@/server/services/sellers-notify";

type RouteContext = { params: Promise<{ id: string; contactId: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id, contactId } = await params;
    await assertCampaignAccess(user, id);
    const body = await request.json().catch(() => ({}));
    const input = notifySellersGroupSchema.parse(body);
    const contact = await notifySellersGroup(user, id, contactId, input);
    return NextResponse.json({ contact });
  } catch (error) {
    return handleApiError(error);
  }
}
