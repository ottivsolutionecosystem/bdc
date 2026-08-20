import { NextResponse, type NextRequest } from "next/server";

import { requireUser, requireSupervisorOrAdmin } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-error";
import { addCampaignAgentSchema } from "@/schemas/campaign";
import { assertCampaignAccess } from "@/server/services/campaign-access";
import { addCampaignAgent, listCampaignAgents, listEligibleAgentUsers } from "@/server/services/campaign";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await params;
    await assertCampaignAccess(user, id);
    requireSupervisorOrAdmin(user);

    const [agents, eligibleUsers] = await Promise.all([
      listCampaignAgents(id),
      listEligibleAgentUsers(),
    ]);
    return NextResponse.json({ agents, eligibleUsers });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await request.json();
    const input = addCampaignAgentSchema.parse(body);
    const agent = await addCampaignAgent(user, id, input.userId);
    return NextResponse.json({ agent }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
