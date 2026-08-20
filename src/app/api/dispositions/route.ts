import { NextResponse, type NextRequest } from "next/server";

import { requireUser } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-error";
import { createDispositionSchema } from "@/schemas/disposition";
import { createGlobalDisposition } from "@/server/services/campaign-dispositions";

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const input = createDispositionSchema.parse(await request.json());
    const disposition = await createGlobalDisposition(user, input);
    return NextResponse.json({ disposition }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
