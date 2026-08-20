import { NextResponse, type NextRequest } from "next/server";

import { requireUser } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-error";
import { updateDispositionSchema } from "@/schemas/disposition";
import { assertCampaignAccess } from "@/server/services/campaign-access";
import { updateCampaignDisposition } from "@/server/services/campaign-dispositions";

type RouteContext = { params: Promise<{ id: string; dispositionId: string }> };

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id, dispositionId } = await params;
    await assertCampaignAccess(user, id);
    const input = updateDispositionSchema.parse(await request.json());
    const disposition = await updateCampaignDisposition(user, id, dispositionId, input);
    return NextResponse.json({ disposition });
  } catch (error) {
    return handleApiError(error);
  }
}
