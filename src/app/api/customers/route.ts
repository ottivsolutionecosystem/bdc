import { NextResponse, type NextRequest } from "next/server";

import { requireUser } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-error";
import { createCustomerSchema } from "@/schemas/customer";
import { createCustomer, listCustomers } from "@/server/services/customers";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const search = request.nextUrl.searchParams.get("q") ?? undefined;
    const customers = await listCustomers(user, search);
    return NextResponse.json({ customers });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const input = createCustomerSchema.parse(await request.json());
    const customer = await createCustomer(user, input);
    return NextResponse.json({ customer }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
