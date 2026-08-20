import { NextResponse, type NextRequest } from "next/server";

import { requireUser } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-error";
import { redistributeAllContacts } from "@/server/services/campaign-distribution";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const result = await redistributeAllContacts(user, id);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
