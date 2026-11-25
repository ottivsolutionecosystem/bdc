import { NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { requireUser } from "@/lib/permissions";
import { updateFairTaskSchema } from "@/schemas/floor";
import { deleteFairTask, updateFairTask } from "@/server/services/fair-control";

export async function PATCH(request: Request, context: { params: Promise<{ eventId: string; taskId: string }> }) {
  try {
    const user = await requireUser();
    const { eventId, taskId } = await context.params;
    const input = updateFairTaskSchema.parse(await request.json());
    const task = await updateFairTask(user, eventId, taskId, input);
    return NextResponse.json({ task });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ eventId: string; taskId: string }> }) {
  try {
    const user = await requireUser();
    const { eventId, taskId } = await context.params;
    await deleteFairTask(user, eventId, taskId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
