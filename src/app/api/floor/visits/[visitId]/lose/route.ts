import { NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { requireUser } from "@/lib/permissions";
import { loseVisitSchema } from "@/schemas/floor";
import { loseVisit } from "@/server/services/floor";

export async function POST(request: Request, context: { params: Promise<{ visitId: string }> }) {
  try {
    const user = await requireUser();
    const { visitId } = await context.params;
    const input = loseVisitSchema.parse(await request.json());
    const visit = await loseVisit(user, visitId, input.lostReason);
    return NextResponse.json({ visit });
  } catch (error) {
    return handleApiError(error);
  }
}
