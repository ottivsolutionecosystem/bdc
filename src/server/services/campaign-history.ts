import { prisma } from "@/lib/prisma";

export async function listCampaignAuditLogs(campaignId: string, take = 100) {
  return prisma.auditLog.findMany({
    where: {
      OR: [
        { entityType: "Campaign", entityId: campaignId },
        { metadata: { path: ["campaignId"], equals: campaignId } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take,
    include: { user: { select: { id: true, name: true } } },
  });
}

export async function listCampaignTransfers(campaignId: string, take = 100) {
  return prisma.campaignTransfer.findMany({
    where: { contact: { campaignId } },
    orderBy: { createdAt: "desc" },
    take,
    include: {
      contact: { select: { id: true, name: true, phone: true } },
      seller: { select: { id: true, name: true } },
      agent: { select: { id: true, name: true } },
      disposition: { select: { id: true, label: true } },
    },
  });
}

export async function listCampaignAssignmentHistory(campaignId: string, take = 100) {
  return prisma.campaignContactAssignmentHistory.findMany({
    where: { contact: { campaignId } },
    orderBy: { createdAt: "desc" },
    take,
    include: {
      contact: { select: { id: true, name: true, phone: true } },
      fromAgent: { select: { id: true, name: true } },
      toAgent: { select: { id: true, name: true } },
      changedBy: { select: { id: true, name: true } },
    },
  });
}
