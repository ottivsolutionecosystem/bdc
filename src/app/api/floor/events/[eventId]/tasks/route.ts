import { NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { requireUser } from "@/lib/permissions";
import { createFairTaskSchema } from "@/schemas/floor";
import { createFairTask } from "@/server/services/fair-control";

export async function POST(request: Request, context: { params: Promise<{ eventId: string }> }) {
  try {
    const user = await requireUser();
    const { eventId } = await context.params;
    const input = createFairTaskSchema.parse(await request.json());
    const task = await createFairTask(user, eventId, input);
    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
