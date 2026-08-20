import { NextResponse, type NextRequest } from "next/server";

import { requireUser } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-error";
import { importCommitSchema } from "@/schemas/import";
import { commitImport } from "@/server/services/campaign-import";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await request.json();
    const input = importCommitSchema.parse(body);
    const result = await commitImport(user, id, input.importSessionId, input.mapping);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
