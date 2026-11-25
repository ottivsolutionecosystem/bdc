import { NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { requireUser } from "@/lib/permissions";
import { updateFairVehicleSchema } from "@/schemas/floor";
import { updateFairVehicle } from "@/server/services/floor";

export async function PATCH(request: Request, context: { params: Promise<{ vehicleId: string }> }) {
  try {
    const user = await requireUser();
    const { vehicleId } = await context.params;
    const input = updateFairVehicleSchema.parse(await request.json());
    const vehicle = await updateFairVehicle(user, vehicleId, input);
    return NextResponse.json({ vehicle });
  } catch (error) {
    return handleApiError(error);
  }
}
