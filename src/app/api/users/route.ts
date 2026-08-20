import { NextResponse, type NextRequest } from "next/server";

import { requireUser } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-error";
import { createUserSchema } from "@/schemas/user";
import { createUser, listUsers } from "@/server/services/users";

export async function GET() {
  try {
    const user = await requireUser();
    const users = await listUsers(user);
    return NextResponse.json({ users });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const input = createUserSchema.parse(await request.json());
    const created = await createUser(user, input);
    return NextResponse.json({ user: created }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
