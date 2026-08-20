import { NextResponse, type NextRequest } from "next/server";

import { requireUser } from "@/lib/permissions";
import { ApiError, handleApiError } from "@/lib/api-error";
import { updateContactFichaSchema } from "@/schemas/customer";
import { assertCampaignAccess } from "@/server/services/campaign-access";
import { getContactFicha, updateContactFicha } from "@/server/services/campaign-contact-ficha";

type RouteContext = { params: Promise<{ id: string; contactId: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id, contactId } = await params;
    await assertCampaignAccess(user, id);
    const contact = await getContactFicha(id, contactId);
    if (user.role === "AGENT" && contact.assignedAgentId !== user.id) {
      throw new ApiError(403, "Este contato não está atribuído a você");
    }
    return NextResponse.json({ contact });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id, contactId } = await params;
    await assertCampaignAccess(user, id);
    const input = updateContactFichaSchema.parse(await request.json());
    const contact = await updateContactFicha(user, id, contactId, input);
    return NextResponse.json({ contact });
  } catch (error) {
    return handleApiError(error);
  }
}
