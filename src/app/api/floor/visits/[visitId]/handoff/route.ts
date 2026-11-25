import { NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { requireUser } from "@/lib/permissions";
import { handoffVisitSchema } from "@/schemas/floor";
import { handoffVisit } from "@/server/services/floor";

export async function POST(request: Request, context: { params: Promise<{ visitId: string }> }) {
  try {
    const user = await requireUser();
    const { visitId } = await context.params;
    const input = handoffVisitSchema.parse(await request.json());
    const visit = await handoffVisit(user, visitId, input.targetUserId);
    return NextResponse.json({ visit });
  } catch (error) {
    return handleApiError(error);
  }
}
