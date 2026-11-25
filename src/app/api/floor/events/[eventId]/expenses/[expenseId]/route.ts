import { NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { requireUser } from "@/lib/permissions";
import { updateFairExpenseSchema } from "@/schemas/floor";
import { deleteFairExpense, updateFairExpense } from "@/server/services/fair-control";

export async function PATCH(request: Request, context: { params: Promise<{ eventId: string; expenseId: string }> }) {
  try {
    const user = await requireUser();
    const { eventId, expenseId } = await context.params;
    const input = updateFairExpenseSchema.parse(await request.json());
    const expense = await updateFairExpense(user, eventId, expenseId, input);
    return NextResponse.json({ expense });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ eventId: string; expenseId: string }> }) {
  try {
    const user = await requireUser();
    const { eventId, expenseId } = await context.params;
    await deleteFairExpense(user, eventId, expenseId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
