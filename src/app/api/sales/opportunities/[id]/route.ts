import { NextResponse, type NextRequest } from "next/server";

import { requireUser } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-error";
import { updateOpportunitySchema } from "@/schemas/sales";
import { updateSellerOpportunity } from "@/server/services/sales";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const input = updateOpportunitySchema.parse(await request.json());
    const opportunity = await updateSellerOpportunity(user, id, input);
    return NextResponse.json({ opportunity });
  } catch (error) {
    return handleApiError(error);
  }
}
