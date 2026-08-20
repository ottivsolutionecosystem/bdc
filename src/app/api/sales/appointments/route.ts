import { NextResponse, type NextRequest } from "next/server";

import { requireUser } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-error";
import { createAppointmentSchema } from "@/schemas/sales";
import { createSellerAppointment } from "@/server/services/sales";

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const input = createAppointmentSchema.parse(await request.json());
    const appointment = await createSellerAppointment(user, {
      customerId: input.customerId,
      scheduledAt: input.scheduledAt,
      notes: input.notes,
    });
    return NextResponse.json({ appointment }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
