import { NextResponse, type NextRequest } from "next/server";

import { requireUser } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-error";
import { updateAppointmentSchema } from "@/schemas/sales";
import { updateSellerAppointment } from "@/server/services/sales";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const input = updateAppointmentSchema.parse(await request.json());
    const appointment = await updateSellerAppointment(user, id, input);
    return NextResponse.json({ appointment });
  } catch (error) {
    return handleApiError(error);
  }
}
