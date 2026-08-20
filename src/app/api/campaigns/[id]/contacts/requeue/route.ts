import { NextResponse, type NextRequest } from "next/server";

import { requireUser } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-error";
import { requeueContactsSchema } from "@/schemas/contact-action";
import { requeueContactsToOtherAgents } from "@/server/services/campaign-contact-actions";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const input = requeueContactsSchema.parse(await request.json());
    const result = await requeueContactsToOtherAgents(user, id, input.contactIds, {
      toUserId: input.toUserId,
      nextContactAt: input.nextContactAt ? new Date(input.nextContactAt) : undefined,
      note: input.note,
    });
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
