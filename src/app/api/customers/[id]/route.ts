import { NextResponse, type NextRequest } from "next/server";

import { requireUser } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-error";
import { updateCustomerSchema } from "@/schemas/customer";
import { updateCustomer } from "@/server/services/customers";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const input = updateCustomerSchema.parse(await request.json());
    const customer = await updateCustomer(user, id, input);
    return NextResponse.json({ customer });
  } catch (error) {
    return handleApiError(error);
  }
}
