import { NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { requireUser } from "@/lib/permissions";
import { createFairVehicleSchema } from "@/schemas/floor";
import { createFairVehicle } from "@/server/services/floor";

export async function POST(request: Request, context: { params: Promise<{ eventId: string }> }) {
  try {
    const user = await requireUser();
    const { eventId } = await context.params;
    const input = createFairVehicleSchema.parse(await request.json());
    const vehicle = await createFairVehicle(user, eventId, input);
    return NextResponse.json({ vehicle }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
