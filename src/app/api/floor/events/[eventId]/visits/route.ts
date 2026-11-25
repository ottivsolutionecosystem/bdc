import { NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { requireUser } from "@/lib/permissions";
import { checkInSchema } from "@/schemas/floor";
import { checkInVisit } from "@/server/services/floor";

export async function POST(request: Request, context: { params: Promise<{ eventId: string }> }) {
  try {
    const user = await requireUser();
    const { eventId } = await context.params;
    const input = checkInSchema.parse(await request.json());
    const visit = await checkInVisit(user, eventId, input);
    return NextResponse.json({ visit }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
