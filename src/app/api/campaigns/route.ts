import { NextResponse, type NextRequest } from "next/server";

import { requireUser } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-error";
import { createCampaignSchema } from "@/schemas/campaign";
import { createCampaign, listCampaignsForUser } from "@/server/services/campaign";

export async function GET() {
  try {
    const user = await requireUser();
    const campaigns = await listCampaignsForUser(user);
    return NextResponse.json({ campaigns });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const input = createCampaignSchema.parse(body);
    const campaign = await createCampaign(user, input);
    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
