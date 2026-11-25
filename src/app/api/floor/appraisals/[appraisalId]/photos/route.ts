import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { ApiError, handleApiError } from "@/lib/api-error";
import { requireUser } from "@/lib/permissions";
import { compressAppraisalPhoto } from "@/server/services/image-compress";
import { addAppraisalPhoto } from "@/server/services/floor";

const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request, context: { params: Promise<{ appraisalId: string }> }) {
  try {
    const user = await requireUser();
    const { appraisalId } = await context.params;
    const form = await request.formData();
    const file = form.get("file");
    const slot = String(form.get("slot") ?? "DAMAGE");
    if (!(file instanceof File)) throw new ApiError(422, "Envie uma foto");
    if (!file.type.startsWith("image/")) throw new ApiError(422, "O arquivo precisa ser uma imagem");
    if (file.size <= 0 || file.size > MAX_BYTES) throw new ApiError(422, "A foto precisa ter até 8 MB");
    if (!["FRONT", "RIGHT", "LEFT", "REAR", "DASHBOARD", "DAMAGE"].includes(slot)) {
      throw new ApiError(422, "Tipo de foto inválido");
    }

    let compressed: Buffer;
    try {
      compressed = await compressAppraisalPhoto(Buffer.from(await file.arrayBuffer()));
    } catch {
      throw new ApiError(422, "Não foi possível ler esta foto. Envie uma imagem JPG ou PNG.");
    }

    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const directory = path.join(process.cwd(), "public", "uploads", "appraisals", appraisalId);
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, filename), compressed);
    const visit = await addAppraisalPhoto(
      user,
      appraisalId,
      `/uploads/appraisals/${appraisalId}/${filename}`,
      slot as "FRONT" | "RIGHT" | "LEFT" | "REAR" | "DASHBOARD" | "DAMAGE"
    );
    return NextResponse.json({ visit }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
