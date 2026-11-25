import { NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { requireUser } from "@/lib/permissions";
import { createFairEventSchema } from "@/schemas/floor";
import { createFairEvent, listFairEvents } from "@/server/services/floor";

export async function GET() {
  try {
    const user = await requireUser();
    const events = await listFairEvents(user);
    return NextResponse.json({ events });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const input = createFairEventSchema.parse(await request.json());
    const event = await createFairEvent(user, input);
    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
