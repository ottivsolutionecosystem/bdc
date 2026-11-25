import { NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { requireUser } from "@/lib/permissions";
import { requestAppraisalSchema } from "@/schemas/floor";
import { cancelAppraisal, requestAppraisal } from "@/server/services/floor";

export async function POST(request: Request, context: { params: Promise<{ visitId: string }> }) {
  try {
    const user = await requireUser();
    const { visitId } = await context.params;
    const input = requestAppraisalSchema.parse(await request.json());
    const visit = await requestAppraisal(user, visitId, input.plate);
    return NextResponse.json({ visit });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ visitId: string }> }) {
  try {
    const user = await requireUser();
    const { visitId } = await context.params;
    const visit = await cancelAppraisal(user, visitId);
    return NextResponse.json({ visit });
  } catch (error) {
    return handleApiError(error);
  }
}
