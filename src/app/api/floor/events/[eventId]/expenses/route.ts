import { NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { requireUser } from "@/lib/permissions";
import { createFairExpenseSchema } from "@/schemas/floor";
import { createFairExpense } from "@/server/services/fair-control";

export async function POST(request: Request, context: { params: Promise<{ eventId: string }> }) {
  try {
    const user = await requireUser();
    const { eventId } = await context.params;
    const input = createFairExpenseSchema.parse(await request.json());
    const expense = await createFairExpense(user, eventId, input);
    return NextResponse.json({ expense }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
