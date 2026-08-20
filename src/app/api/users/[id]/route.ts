import { NextResponse, type NextRequest } from "next/server";

import { requireUser } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-error";
import { updateUserSchema } from "@/schemas/user";
import { updateUser } from "@/server/services/users";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const actor = await requireUser();
    const { id } = await params;
    const input = updateUserSchema.parse(await request.json());
    const user = await updateUser(actor, id, input);
    return NextResponse.json({ user });
  } catch (error) {
    return handleApiError(error);
  }
}
