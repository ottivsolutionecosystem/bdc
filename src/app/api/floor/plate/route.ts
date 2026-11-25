import { NextResponse, type NextRequest } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { requireUser, requireRole } from "@/lib/permissions";
import { lookupPlate } from "@/server/services/plate-lookup";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    requireRole(user, ["ADMIN", "SUPERVISOR", "APPRAISER"]);
    const plate = request.nextUrl.searchParams.get("plate") ?? "";
    const result = await lookupPlate(plate);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
