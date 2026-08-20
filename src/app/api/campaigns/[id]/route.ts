import { NextResponse, type NextRequest } from "next/server";

import { isSupervisorOrAdmin, requireUser } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-error";
import { updateCampaignSchema } from "@/schemas/campaign";
import { assertCampaignAccess } from "@/server/services/campaign-access";
import { getCampaignOrThrow, updateCampaign } from "@/server/services/campaign";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await params;
    await assertCampaignAccess(user, id);
    const campaign = await getCampaignOrThrow(id);
    if (!isSupervisorOrAdmin(user)) {
      const { sellersNotifyWebhookUrl: _webhook, ...safe } = campaign;
      return NextResponse.json({ campaign: safe });
    }
    return NextResponse.json({ campaign });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await params;
    await assertCampaignAccess(user, id);
    const body = await request.json();
    const input = updateCampaignSchema.parse(body);
    const campaign = await updateCampaign(user, id, input);
    return NextResponse.json({ campaign });
  } catch (error) {
    return handleApiError(error);
  }
}
