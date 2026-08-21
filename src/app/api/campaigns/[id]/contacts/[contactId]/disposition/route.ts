import { NextResponse, type NextRequest } from "next/server";

import { requireUser } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-error";
import { updateContactDispositionSchema } from "@/schemas/contact-action";
import { assertCampaignAccess } from "@/server/services/campaign-access";
import { correctContactDisposition } from "@/server/services/campaign-contact-actions";

type RouteContext = { params: Promise<{ id: string; contactId: string }> };

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id, contactId } = await params;
    await assertCampaignAccess(user, id);
    const input = updateContactDispositionSchema.parse(await request.json());
    const contact = await correctContactDisposition(user, id, contactId, input.dispositionId);
    return NextResponse.json({ contact });
  } catch (error) {
    return handleApiError(error);
  }
}
