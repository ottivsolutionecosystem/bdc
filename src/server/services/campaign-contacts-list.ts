import type { Prisma } from "@/generated/prisma/client";
import type { ContactStatus, ContactTemperature } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { actionableContactsWhere, type ContactListGroup } from "@/lib/contact-action";
import {
  appointmentDispositionWhere,
  contactWhereForMetric,
  interestedDispositionWhere,
  noInterestDispositionWhere,
  type DispositionMetric,
} from "@/lib/disposition-metrics";

const UNTREATED_STATUSES: ContactStatus[] = ["UNTREATED", "ATTEMPTING", "FOLLOW_UP"];
const TREATED_STATUSES: ContactStatus[] = ["TREATED", "CONVERTED", "NOT_REACHED"];

export type { ContactListGroup };

export type ContactListFilters = {
  group: ContactListGroup;
  agentId?: string;
  status?: ContactStatus;
  dispositionId?: string;
  temperature?: ContactTemperature;
  vehicle?: string;
  search?: string;
  interested?: boolean;
  hasAppointment?: boolean;
  transferredToSales?: boolean;
  metric?: DispositionMetric;
  attemptNumber?: number;
  periodStart?: string;
  periodEnd?: string;
  page?: number;
  pageSize?: number;
};

export async function listContactsFiltered(campaignId: string, filters: ContactListFilters) {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize = filters.pageSize && filters.pageSize > 0 ? Math.min(filters.pageSize, 200) : 50;

  const clauses: Prisma.CampaignContactWhereInput[] = [{ campaignId }];

  if (filters.metric) {
    clauses.push(contactWhereForMetric(filters.metric));
    if (filters.status) clauses.push({ status: filters.status });
  } else if (filters.group === "action") {
    clauses.push(actionableContactsWhere(campaignId));
    if (filters.status) clauses.push({ status: filters.status });
  } else if (filters.group !== "all") {
    clauses.push({
      status: {
        in: filters.status
          ? [filters.status]
          : filters.group === "treated"
            ? TREATED_STATUSES
            : UNTREATED_STATUSES,
      },
    });
  } else if (filters.status) {
    clauses.push({ status: filters.status });
  }

  if (filters.agentId) clauses.push({ assignedAgentId: filters.agentId });
  if (filters.dispositionId) clauses.push({ finalDispositionId: filters.dispositionId });
  if (filters.vehicle) clauses.push({ lastVehicle: { contains: filters.vehicle, mode: "insensitive" } });

  if (filters.temperature) clauses.push({ temperature: filters.temperature });
  if (filters.interested) clauses.push({ finalDisposition: interestedDispositionWhere });
  if (filters.hasAppointment) clauses.push({ finalDisposition: appointmentDispositionWhere });
  if (filters.transferredToSales) clauses.push({ finalDisposition: noInterestDispositionWhere });
  if (filters.attemptNumber) clauses.push({ attemptsCount: filters.attemptNumber });

  if (filters.periodStart || filters.periodEnd) {
    clauses.push({
      lastAttemptAt: {
        ...(filters.periodStart ? { gte: new Date(filters.periodStart) } : {}),
        ...(filters.periodEnd ? { lte: new Date(filters.periodEnd) } : {}),
      },
    });
  }

  if (filters.search) {
    const digits = filters.search.replace(/\D/g, "");
    clauses.push({
      OR: [
        { name: { contains: filters.search, mode: "insensitive" } },
        { lastVehicle: { contains: filters.search, mode: "insensitive" } },
        ...(digits ? [{ phoneNormalized: { contains: digits } }] : []),
      ],
    });
  }

  const where: Prisma.CampaignContactWhereInput = { AND: clauses };

  const [contacts, total] = await Promise.all([
    prisma.campaignContact.findMany({
      where,
      orderBy:
        filters.group === "action" && !filters.metric
          ? [{ nextContactAt: "asc" }, { lastAttemptAt: "desc" }]
          : filters.group === "treated" || filters.metric
            ? { lastAttemptAt: "desc" }
            : { createdAt: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        assignedAgent: { select: { id: true, name: true } },
        finalDisposition: { select: { id: true, label: true } },
        appointment: { select: { id: true, scheduledAt: true, seller: { select: { name: true } } } },
      },
    }),
    prisma.campaignContact.count({ where }),
  ]);

  return { contacts, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function countActionableContacts(campaignId: string) {
  return prisma.campaignContact.count({ where: actionableContactsWhere(campaignId) });
}
