import { NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { requireUser } from "@/lib/permissions";
import { closeDealSchema } from "@/schemas/floor";
import { closeDeal } from "@/server/services/floor";

export async function POST(request: Request, context: { params: Promise<{ visitId: string }> }) {
  try {
    const user = await requireUser();
    const { visitId } = await context.params;
    const input = closeDealSchema.parse(await request.json());
    const visit = await closeDeal(user, visitId, input);
    return NextResponse.json({ visit });
  } catch (error) {
    return handleApiError(error);
  }
}
