import { z } from "zod";

export const updateOpportunitySchema = z
  .object({
    status: z.enum(["OPEN", "WON", "LOST"]).optional(),
    notes: z.string().trim().max(4000).nullable().optional(),
  })
  .refine((value) => value.status !== undefined || value.notes !== undefined, {
    message: "Informe status ou observação",
  });

export const updateAppointmentSchema = z
  .object({
    status: z.enum(["SCHEDULED", "DONE", "CANCELED"]).optional(),
    notes: z.string().trim().max(4000).nullable().optional(),
  })
  .refine((value) => value.status !== undefined || value.notes !== undefined, {
    message: "Informe status ou observação",
  });

export const createAppointmentSchema = z.object({
  customerId: z.string().min(1),
  scheduledAt: z.string().datetime(),
  notes: z.string().trim().max(4000).optional().or(z.literal("")),
});
