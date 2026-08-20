import { NextResponse, type NextRequest } from "next/server";

import { requireUser } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-error";
import { reopenContactsSchema } from "@/schemas/contact-action";
import { reopenContactsToSameQueue } from "@/server/services/campaign-contact-actions";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const input = reopenContactsSchema.parse(await request.json());
    const result = await reopenContactsToSameQueue(user, id, input.contactIds, {
      nextContactAt: input.nextContactAt ? new Date(input.nextContactAt) : undefined,
      note: input.note,
    });
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
