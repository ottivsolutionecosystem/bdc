import { NextResponse, type NextRequest } from "next/server";

import { requireUser } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-error";
import { updateCampaignAgentSchema } from "@/schemas/campaign";
import { setCampaignAgentActive } from "@/server/services/campaign";
import { removeCampaignAgentAndRedistribute } from "@/server/services/campaign-distribution";

type RouteContext = { params: Promise<{ id: string; agentId: string }> };

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id, agentId } = await params;
    const body = await request.json();
    const input = updateCampaignAgentSchema.parse(body);
    const agent = await setCampaignAgentActive(user, id, agentId, input.active);
    return NextResponse.json({ agent });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id, agentId } = await params;
    const result = await removeCampaignAgentAndRedistribute(user, id, agentId);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
