import { z } from "zod";

export const purchaseTimelineValues = ["NOW", "WITHIN_30D", "D60_90", "NO_FORECAST"] as const;
export const eventInterestValues = ["YES", "MAYBE", "NO"] as const;

export const qualificationSchema = z.object({
  stillOwnsLastVehicle: z.boolean().optional(),
  currentVehicle: z.string().trim().max(200).optional(),
  interestedInTrade: z.boolean().optional(),
  purchaseTimeline: z.enum(purchaseTimelineValues).optional(),
  interestedInEvent: z.enum(eventInterestValues).optional(),
});

export type QualificationInput = z.infer<typeof qualificationSchema>;

export const appointmentInputSchema = z.object({
  scheduledAt: z.string().datetime(),
  sellerId: z.string().optional(),
  notes: z.string().trim().max(500).optional(),
});

export type AppointmentInput = z.infer<typeof appointmentInputSchema>;

export const submitAttemptSchema = z.object({
  dispositionId: z.string().min(1, "Selecione um parecer"),
  notes: z.string().trim().max(2000).optional(),
  nextContactAt: z.string().datetime().optional(),
  qualification: qualificationSchema.optional(),
  appointment: appointmentInputSchema.optional(),
});

export type SubmitAttemptInput = z.infer<typeof submitAttemptSchema>;

export const transferToSalesSchema = z.object({
  sellerId: z.string().min(1, "Selecione um vendedor"),
  notes: z.string().trim().max(1000).optional(),
});

export const notifySellersGroupSchema = z.object({
  note: z.string().trim().max(500).optional(),
});

export type NotifySellersGroupInput = z.infer<typeof notifySellersGroupSchema>;

export type TransferToSalesInput = z.infer<typeof transferToSalesSchema>;

export const overrideTemperatureSchema = z.object({
  temperature: z.enum(["HOT", "WARM", "FOLLOW_UP", "COLD", "NOT_REACHED"]),
});
