import { NextResponse } from "next/server";

import { requireUser } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-error";
import { listSellers } from "@/server/services/campaign-dispositions";

export async function GET() {
  try {
    await requireUser();
    const sellers = await listSellers();
    return NextResponse.json({ sellers });
  } catch (error) {
    return handleApiError(error);
  }
}
