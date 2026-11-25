import { NextResponse, type NextRequest } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { requireUser } from "@/lib/permissions";
import { lookupFloorCustomer } from "@/server/services/floor";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const document = request.nextUrl.searchParams.get("document") ?? undefined;
    const phone = request.nextUrl.searchParams.get("phone") ?? undefined;
    const result = await lookupFloorCustomer(user, { document, phone });
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
