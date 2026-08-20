import { z } from "zod";

export const importTargetFields = ["name", "phone", "lastVehicle", "lastPurchaseDate"] as const;
export type ImportTargetField = (typeof importTargetFields)[number];

export const IMPORT_TARGET_FIELD_LABELS: Record<ImportTargetField, string> = {
  name: "Nome do cliente",
  phone: "Telefone",
  lastVehicle: "Último veículo comprado",
  lastPurchaseDate: "Data da última compra",
};

// Mapeia campo do CRM -> índice da coluna no arquivo (ou null para ignorar).
export const columnMappingSchema = z.object({
  name: z.number().int().nonnegative(),
  phone: z.number().int().nonnegative(),
  lastVehicle: z.number().int().nonnegative().nullable().optional(),
  lastPurchaseDate: z.number().int().nonnegative().nullable().optional(),
});

export type ColumnMapping = z.infer<typeof columnMappingSchema>;

export const importPreviewSchema = z.object({
  importSessionId: z.string().cuid(),
  mapping: columnMappingSchema,
});

export const importCommitSchema = z.object({
  importSessionId: z.string().cuid(),
  mapping: columnMappingSchema,
});
