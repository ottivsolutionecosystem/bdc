import { z } from "zod";

export const updateContactFichaSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  email: z.string().trim().email("E-mail inválido").nullable().optional().or(z.literal("")),
  document: z.string().trim().max(20).nullable().optional().or(z.literal("")),
  notes: z.string().trim().max(4000).nullable().optional(),
});

export type UpdateContactFichaInput = z.infer<typeof updateContactFichaSchema>;

export const createCustomerSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome"),
  phone: z.string().trim().min(8, "Informe o telefone"),
  email: z.string().trim().email("E-mail inválido").optional().or(z.literal("")),
  document: z.string().trim().max(20).optional().or(z.literal("")),
});

export const updateCustomerSchema = z.object({
  name: z.string().trim().min(2).optional(),
  phone: z.string().trim().min(8).optional(),
  email: z.string().trim().email("E-mail inválido").nullable().optional().or(z.literal("")),
  document: z.string().trim().max(20).nullable().optional().or(z.literal("")),
});
