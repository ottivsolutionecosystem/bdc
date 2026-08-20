import { z } from "zod";

export const dispositionCategoryValues = [
  "POSITIVE",
  "CONVERSION",
  "FOLLOW_UP",
  "NO_INTEREST",
  "NOT_REACHED",
] as const;

export const contactTemperatureValues = ["HOT", "WARM", "FOLLOW_UP", "COLD", "NOT_REACHED"] as const;

export const createDispositionSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "Informe um código")
    .max(50)
    .regex(/^[a-z0-9_]+$/, "Use apenas letras minúsculas, números e underscore"),
  label: z.string().trim().min(2, "Informe o nome do parecer").max(80),
  category: z.enum(dispositionCategoryValues),
  requiresNextContact: z.boolean().optional(),
  defaultTemperature: z.enum(contactTemperatureValues),
});

export type CreateDispositionInput = z.infer<typeof createDispositionSchema>;

export const updateDispositionSchema = z.object({
  label: z.string().trim().min(2).max(80).optional(),
  requiresNextContact: z.boolean().optional(),
  defaultTemperature: z.enum(contactTemperatureValues).optional(),
  active: z.boolean().optional(),
});

export type UpdateDispositionInput = z.infer<typeof updateDispositionSchema>;
