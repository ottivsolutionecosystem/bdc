import { NextResponse, type NextRequest } from "next/server";

import { requireUser } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-error";
import { assertCampaignAccess } from "@/server/services/campaign-access";
import { openAuttusConversation } from "@/server/services/auttus-conversation";

type RouteContext = { params: Promise<{ id: string; contactId: string }> };

export async function POST(_request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id, contactId } = await params;
    await assertCampaignAccess(user, id);
    const conversation = await openAuttusConversation(user, id, contactId);
    return NextResponse.json(conversation);
  } catch (error) {
    return handleApiError(error);
  }
}
