import type { Prisma, PrismaClient } from "@/generated/prisma/client";

type PrismaTx = PrismaClient | Prisma.TransactionClient;

export async function recordAudit(
  tx: PrismaTx,
  params: {
    userId: string;
    entityType: string;
    entityId: string;
    action: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  await tx.auditLog.create({
    data: {
      userId: params.userId,
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      metadata: params.metadata as Prisma.InputJsonValue | undefined,
    },
  });
}
