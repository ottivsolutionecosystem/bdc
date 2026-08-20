import { NextResponse, type NextRequest } from "next/server";

import { requireUser } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-error";
import { transferToSalesSchema } from "@/schemas/attempt";
import { assertCampaignAccess } from "@/server/services/campaign-access";
import { transferContactToSales } from "@/server/services/campaign-transfer";

type RouteContext = { params: Promise<{ id: string; contactId: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id, contactId } = await params;
    await assertCampaignAccess(user, id);
    const body = await request.json();
    const input = transferToSalesSchema.parse(body);
    const transfer = await transferContactToSales(user, id, contactId, input);
    return NextResponse.json({ transfer }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
