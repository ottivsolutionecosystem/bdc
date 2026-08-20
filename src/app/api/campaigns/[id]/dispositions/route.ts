import { NextResponse, type NextRequest } from "next/server";

import { requireUser } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-error";
import { createDispositionSchema } from "@/schemas/disposition";
import { assertCampaignAccess } from "@/server/services/campaign-access";
import { createCampaignDisposition, listActiveDispositions } from "@/server/services/campaign-dispositions";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await params;
    await assertCampaignAccess(user, id);
    const dispositions = await listActiveDispositions(id);
    return NextResponse.json({ dispositions });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await params;
    await assertCampaignAccess(user, id);
    const input = createDispositionSchema.parse(await request.json());
    const disposition = await createCampaignDisposition(user, id, input);
    return NextResponse.json({ disposition }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
