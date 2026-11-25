import { NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { requireUser } from "@/lib/permissions";
import { updateFairProjectionSchema } from "@/schemas/floor";
import { updateFairProjection } from "@/server/services/fair-control";

export async function PATCH(request: Request, context: { params: Promise<{ eventId: string }> }) {
  try {
    const user = await requireUser();
    const { eventId } = await context.params;
    const input = updateFairProjectionSchema.parse(await request.json());
    await updateFairProjection(user, eventId, input);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
