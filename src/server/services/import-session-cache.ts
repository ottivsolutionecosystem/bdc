import type { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import type { ParsedSpreadsheet } from "@/lib/spreadsheet";

const SESSION_TTL_MS = 30 * 60 * 1000;

type ImportSession = {
  campaignId: string;
  userId: string;
  fileName: string;
  data: ParsedSpreadsheet;
  createdAt: number;
};

async function cleanupExpired() {
  await prisma.campaignImportSession.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
}

export async function createImportSession(params: {
  campaignId: string;
  userId: string;
  fileName: string;
  data: ParsedSpreadsheet;
}): Promise<string> {
  await cleanupExpired();
  const session = await prisma.campaignImportSession.create({
    data: {
      campaignId: params.campaignId,
      userId: params.userId,
      fileName: params.fileName,
      headers: params.data.headers,
      rows: params.data.rows as Prisma.InputJsonValue,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
    select: { id: true },
  });
  return session.id;
}

export async function getImportSession(id: string, campaignId: string): Promise<ImportSession | undefined> {
  await cleanupExpired();
  const session = await prisma.campaignImportSession.findUnique({ where: { id } });
  if (!session || session.campaignId !== campaignId) return undefined;
  return {
    campaignId: session.campaignId,
    userId: session.userId,
    fileName: session.fileName,
    data: {
      headers: session.headers as string[],
      rows: session.rows as string[][],
    },
    createdAt: session.createdAt.getTime(),
  };
}

export async function deleteImportSession(id: string): Promise<void> {
  await prisma.campaignImportSession.deleteMany({ where: { id } });
}
