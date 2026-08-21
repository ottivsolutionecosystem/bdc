import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { handleApiError, ApiError } from "@/lib/api-error";
import { submitAttemptSchema } from "@/schemas/attempt";
import { assertCampaignAccess } from "@/server/services/campaign-access";
import { submitAttempt } from "@/server/services/campaign-operation";

type RouteContext = { params: Promise<{ id: string; contactId: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id, contactId } = await params;
    await assertCampaignAccess(user, id);

    const contact = await prisma.campaignContact.findUnique({ where: { id: contactId } });
    if (!contact || contact.campaignId !== id) {
      throw new ApiError(404, "Contato não encontrado nesta campanha");
    }
    if (user.role === "AGENT" && contact.assignedAgentId !== user.id) {
      throw new ApiError(403, "Este contato não está atribuído a você");
    }

    const attempts = await prisma.campaignContactAttempt.findMany({
      where: { contactId },
      orderBy: { attemptNumber: "asc" },
      include: {
        agent: { select: { name: true } },
        disposition: { select: { label: true, category: true } },
      },
    });
    return NextResponse.json({ attempts });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id, contactId } = await params;
    await assertCampaignAccess(user, id);
    const body = await request.json();
    const input = submitAttemptSchema.parse(body);
    const { contact, sellersNotify } = await submitAttempt(user, id, contactId, input);
    return NextResponse.json({ contact, sellersNotify });
  } catch (error) {
    return handleApiError(error);
  }
}
