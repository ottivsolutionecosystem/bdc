import { NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { requireUser } from "@/lib/permissions";
import { updateFairEventSchema } from "@/schemas/floor";
import { updateFairEvent } from "@/server/services/floor";

export async function PATCH(request: Request, context: { params: Promise<{ eventId: string }> }) {
  try {
    const user = await requireUser();
    const { eventId } = await context.params;
    const input = updateFairEventSchema.parse(await request.json());
    const event = await updateFairEvent(user, eventId, input);
    return NextResponse.json({ event });
  } catch (error) {
    return handleApiError(error);
  }
}
