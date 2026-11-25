import { NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { requireUser } from "@/lib/permissions";
import { updateInterestsSchema } from "@/schemas/floor";
import { updateVisitInterests } from "@/server/services/floor";

export async function PUT(request: Request, context: { params: Promise<{ visitId: string }> }) {
  try {
    const user = await requireUser();
    const { visitId } = await context.params;
    const input = updateInterestsSchema.parse(await request.json());
    const visit = await updateVisitInterests(user, visitId, input.interests);
    return NextResponse.json({ visit });
  } catch (error) {
    return handleApiError(error);
  }
}
