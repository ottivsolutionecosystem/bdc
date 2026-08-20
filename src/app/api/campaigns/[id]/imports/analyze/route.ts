import { NextResponse, type NextRequest } from "next/server";

import { requireUser } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-error";
import { ApiError } from "@/lib/api-error";
import { analyzeImportFile } from "@/server/services/campaign-import";

type RouteContext = { params: Promise<{ id: string }> };

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25MB

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      throw new ApiError(422, "Envie um arquivo no campo 'file'.");
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new ApiError(422, "Arquivo muito grande (limite de 25MB).");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await analyzeImportFile(user, id, file.name, buffer);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
