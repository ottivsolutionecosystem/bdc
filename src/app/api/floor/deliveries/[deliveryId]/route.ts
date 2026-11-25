import { NextResponse } from "next/server";

import { ApiError, handleApiError } from "@/lib/api-error";
import { requireUser } from "@/lib/permissions";
import { advanceDelivery } from "@/server/services/floor";

export async function PATCH(request: Request, context: { params: Promise<{ deliveryId: string }> }) {
  try {
    const user = await requireUser();
    const { deliveryId } = await context.params;
    const body = (await request.json()) as { action?: string };
    if (body.action !== "start" && body.action !== "finish") {
      throw new ApiError(422, "Ação inválida");
    }
    const visit = await advanceDelivery(user, deliveryId, body.action);
    return NextResponse.json({ visit });
  } catch (error) {
    return handleApiError(error);
  }
}
