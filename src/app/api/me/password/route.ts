import { NextResponse, type NextRequest } from "next/server";

import { requireUser } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-error";
import { changePasswordSchema } from "@/schemas/auth";
import { changeOwnPassword } from "@/server/services/password";

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireUser();
    const input = changePasswordSchema.parse(await request.json());
    await changeOwnPassword(user, input.currentPassword, input.password);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
