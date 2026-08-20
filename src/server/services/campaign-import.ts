import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-error";
import { requireSupervisorOrAdmin, type SessionUser } from "@/lib/permissions";
import { normalizePhone } from "@/lib/phone";
import { parseSpreadsheetFile, type ParsedSpreadsheet } from "@/lib/spreadsheet";
import { chunkArray } from "@/lib/array";
import { recordAudit } from "@/server/services/audit";
import { distributeContacts } from "@/server/services/campaign-distribution";
import {
  createImportSession,
  getImportSession,
  deleteImportSession,
} from "@/server/services/import-session-cache";
import type { ColumnMapping, ImportTargetField } from "@/schemas/import";
import { getCampaignOrThrow } from "@/server/services/campaign";
import { assertCampaignAcceptsSetup } from "@/lib/campaign-lifecycle";

const HEADER_SUGGESTIONS: Record<ImportTargetField, string[]> = {
  name: ["nome", "nome cliente", "cliente", "nome do cliente"],
  phone: ["telefone", "celular", "fone", "whatsapp", "contato"],
  lastVehicle: ["ultimo carro", "ultimo veiculo", "veiculo", "modelo"],
  lastPurchaseDate: ["data compra", "data da compra", "data ultima compra", "data última compra"],
};

function normalizeHeader(header: string): string {
  return header
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function suggestColumnMapping(headers: string[]): Partial<Record<ImportTargetField, number>> {
  const normalized = headers.map(normalizeHeader);
  const mapping: Partial<Record<ImportTargetField, number>> = {};

  (Object.keys(HEADER_SUGGESTIONS) as ImportTargetField[]).forEach((field) => {
    const candidates = HEADER_SUGGESTIONS[field];
    const index = normalized.findIndex((header) => candidates.some((c) => header === c || header.includes(c)));
    if (index !== -1) mapping[field] = index;
  });

  return mapping;
}

export async function analyzeImportFile(
  user: SessionUser,
  campaignId: string,
  fileName: string,
  buffer: Buffer
) {
  requireSupervisorOrAdmin(user);
  const campaign = await getCampaignOrThrow(campaignId);
  assertCampaignAcceptsSetup(campaign.status);

  const data = await parseSpreadsheetFile(buffer, fileName);
  if (data.headers.length === 0 || data.rows.length === 0) {
    throw new ApiError(422, "Não foi possível ler colunas ou linhas no arquivo enviado.");
  }

  const importSessionId = await createImportSession({ campaignId, userId: user.id, fileName, data });

  return {
    importSessionId,
    headers: data.headers,
    totalRows: data.rows.length,
    sampleRows: data.rows.slice(0, 5),
    suggestedMapping: suggestColumnMapping(data.headers),
  };
}

type MappedRow = {
  name: string;
  phoneRaw: string;
  phoneNormalized: string;
  phoneValid: boolean;
  lastVehicle: string | null;
  lastPurchaseDate: Date | null;
};

function mapRows(data: ParsedSpreadsheet, mapping: ColumnMapping): MappedRow[] {
  return data.rows.map((row) => {
    const name = (row[mapping.name] ?? "").trim();
    const phoneRaw = (row[mapping.phone] ?? "").trim();
    const { normalized, valid } = normalizePhone(phoneRaw);

    const lastVehicle =
      mapping.lastVehicle !== null && mapping.lastVehicle !== undefined
        ? (row[mapping.lastVehicle] ?? "").trim() || null
        : null;

    const rawDate =
      mapping.lastPurchaseDate !== null && mapping.lastPurchaseDate !== undefined
        ? (row[mapping.lastPurchaseDate] ?? "").trim()
        : "";
    const parsedDate = rawDate ? new Date(rawDate) : null;
    const lastPurchaseDate = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null;

    return { name, phoneRaw, phoneNormalized: normalized, phoneValid: valid, lastVehicle, lastPurchaseDate };
  });
}

async function analyzeRows(campaignId: string, data: ParsedSpreadsheet, mapping: ColumnMapping) {
  const mappedRows = mapRows(data, mapping);

  const seenInFile = new Set<string>();
  let duplicatesInFile = 0;
  let invalidPhones = 0;
  const uniqueValidRows: MappedRow[] = [];

  for (const row of mappedRows) {
    if (!row.phoneValid || !row.name) {
      if (!row.phoneValid) invalidPhones += 1;
      continue;
    }
    if (seenInFile.has(row.phoneNormalized)) {
      duplicatesInFile += 1;
      continue;
    }
    seenInFile.add(row.phoneNormalized);
    uniqueValidRows.push(row);
  }

  const existingPhones = new Set<string>();
  for (const chunk of chunkArray(Array.from(seenInFile), 1000)) {
    const existing = await prisma.campaignContact.findMany({
      where: { campaignId, phoneNormalized: { in: chunk } },
      select: { phoneNormalized: true },
    });
    existing.forEach((c) => existingPhones.add(c.phoneNormalized));
  }

  const importableRows = uniqueValidRows.filter((row) => !existingPhones.has(row.phoneNormalized));

  return {
    mappedRows,
    totalRows: mappedRows.length,
    validPhones: mappedRows.filter((r) => r.phoneValid && r.name).length,
    invalidPhones,
    duplicatesInFile,
    existingInCampaign: uniqueValidRows.length - importableRows.length,
    importableRows,
  };
}

export async function previewImport(
  user: SessionUser,
  campaignId: string,
  importSessionId: string,
  mapping: ColumnMapping
) {
  requireSupervisorOrAdmin(user);
  const campaign = await getCampaignOrThrow(campaignId);
  assertCampaignAcceptsSetup(campaign.status);
  const session = await getImportSession(importSessionId, campaignId);
  if (!session) throw new ApiError(404, "Sessão de importação expirada. Envie o arquivo novamente.");

  const analysis = await analyzeRows(campaignId, session.data, mapping);

  return {
    totalRows: analysis.totalRows,
    validPhones: analysis.validPhones,
    invalidPhones: analysis.invalidPhones,
    duplicatesInFile: analysis.duplicatesInFile,
    existingInCampaign: analysis.existingInCampaign,
    importableCount: analysis.importableRows.length,
    sampleInvalid: analysis.mappedRows
      .filter((r) => !r.phoneValid || !r.name)
      .slice(0, 10)
      .map((r) => ({ name: r.name, phone: r.phoneRaw })),
  };
}

export async function commitImport(
  user: SessionUser,
  campaignId: string,
  importSessionId: string,
  mapping: ColumnMapping
) {
  requireSupervisorOrAdmin(user);
  const campaign = await getCampaignOrThrow(campaignId);
  assertCampaignAcceptsSetup(campaign.status);

  const session = await getImportSession(importSessionId, campaignId);
  if (!session) throw new ApiError(404, "Sessão de importação expirada. Envie o arquivo novamente.");

  const analysis = await analyzeRows(campaignId, session.data, mapping);

  const createdContacts = await prisma.$transaction(
    async (tx) => {
      const contacts = await tx.campaignContact.createManyAndReturn({
        data: analysis.importableRows.map((row) => ({
          campaignId,
          name: row.name,
          phone: row.phoneRaw,
          phoneNormalized: row.phoneNormalized,
          lastVehicle: row.lastVehicle,
          lastPurchaseDate: row.lastPurchaseDate,
        })),
        select: { id: true },
      });

      await tx.campaignImport.create({
        data: {
          campaignId,
          userId: user.id,
          fileName: session.fileName,
          totalRows: analysis.totalRows,
          imported: contacts.length,
          ignored: analysis.duplicatesInFile,
          invalid: analysis.invalidPhones,
          duplicated: analysis.existingInCampaign,
          columnMapping: mapping as Prisma.InputJsonValue,
        },
      });

      await distributeContacts(tx, {
        campaignId,
        contactIds: contacts.map((c) => c.id),
        reason: "IMPORT",
        changedById: user.id,
      });

      await recordAudit(tx, {
        userId: user.id,
        entityType: "Campaign",
        entityId: campaignId,
        action: "CONTACTS_IMPORTED",
        metadata: { imported: contacts.length, fileName: session.fileName },
      });

      return contacts;
    },
    { timeout: 60_000 }
  );

  await deleteImportSession(importSessionId);

  return {
    imported: createdContacts.length,
    ignored: analysis.duplicatesInFile,
    invalid: analysis.invalidPhones,
    duplicated: analysis.existingInCampaign,
    totalRows: analysis.totalRows,
  };
}

export async function listCampaignImports(campaignId: string) {
  return prisma.campaignImport.findMany({
    where: { campaignId },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true } } },
  });
}
