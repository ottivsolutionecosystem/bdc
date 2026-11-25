import { NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { requireUser } from "@/lib/permissions";
import { saveAppraisalSchema } from "@/schemas/floor";
import { saveAppraisal } from "@/server/services/floor";

export async function PATCH(request: Request, context: { params: Promise<{ appraisalId: string }> }) {
  try {
    const user = await requireUser();
    const { appraisalId } = await context.params;
    const input = saveAppraisalSchema.parse(await request.json());
    const visit = await saveAppraisal(user, appraisalId, input);
    return NextResponse.json({ visit });
  } catch (error) {
    return handleApiError(error);
  }
}
