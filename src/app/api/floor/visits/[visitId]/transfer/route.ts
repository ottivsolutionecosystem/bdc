import { NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { requireUser } from "@/lib/permissions";
import { transferToFinance } from "@/server/services/floor";

export async function POST(_request: Request, context: { params: Promise<{ visitId: string }> }) {
  try {
    const user = await requireUser();
    const { visitId } = await context.params;
    const visit = await transferToFinance(user, visitId);
    return NextResponse.json({ visit });
  } catch (error) {
    return handleApiError(error);
  }
}
