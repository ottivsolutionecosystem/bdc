import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-error";
import { moveContactToAgent } from "@/server/services/campaign-distribution";

type RouteContext = { params: Promise<{ id: string; contactId: string }> };

const moveContactSchema = z.object({ toUserId: z.string().min(1) });

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id, contactId } = await params;
    const body = await request.json();
    const { toUserId } = moveContactSchema.parse(body);
    await moveContactToAgent(user, id, contactId, toUserId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
