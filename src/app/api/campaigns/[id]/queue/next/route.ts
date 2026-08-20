import { NextResponse, type NextRequest } from "next/server";

import { requireUser } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-error";
import { assertCampaignAccess } from "@/server/services/campaign-access";
import { getNextQueueContact } from "@/server/services/campaign-operation";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await params;
    await assertCampaignAccess(user, id);
    const contact = await getNextQueueContact(user, id);
    return NextResponse.json({ contact });
  } catch (error) {
    return handleApiError(error);
  }
}
