import { NextResponse, type NextRequest } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { forgotPasswordSchema } from "@/schemas/auth";
import { requestPasswordReset } from "@/server/services/password";

export async function POST(request: NextRequest) {
  try {
    const input = forgotPasswordSchema.parse(await request.json());
    const result = await requestPasswordReset(input.email, request.nextUrl.origin);
    return NextResponse.json({
      message: "Se o e-mail existir, enviaremos o link de redefinição.",
      resetUrl: result.resetUrl,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
