import { NextResponse, type NextRequest } from "next/server";

import { requireUser } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-error";
import { overrideTemperatureSchema } from "@/schemas/attempt";
import { assertCampaignAccess } from "@/server/services/campaign-access";
import { overrideContactTemperature } from "@/server/services/campaign-operation";

type RouteContext = { params: Promise<{ id: string; contactId: string }> };

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id, contactId } = await params;
    await assertCampaignAccess(user, id);
    const body = await request.json();
    const input = overrideTemperatureSchema.parse(body);
    const contact = await overrideContactTemperature(user, id, contactId, input.temperature);
    return NextResponse.json({ contact });
  } catch (error) {
    return handleApiError(error);
  }
}
