import { NextResponse, type NextRequest } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { resetPasswordSchema } from "@/schemas/auth";
import { resetPasswordWithToken } from "@/server/services/password";

export async function POST(request: NextRequest) {
  try {
    const input = resetPasswordSchema.parse(await request.json());
    await resetPasswordWithToken(input.token, input.password);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
