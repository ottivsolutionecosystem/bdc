import { z } from "zod";

export const campaignStatusValues = [
  "DRAFT",
  "ACTIVE",
  "PAUSED",
  "COMPLETED",
  "CANCELED",
] as const;

export const campaignTypeValues = [
  "event_invite",
  "reactivation",
  "after_sales",
  "birthday",
  "trade_in",
  "other",
] as const;

export type CampaignTypeValue = (typeof campaignTypeValues)[number];

export function isCampaignType(value: string): value is CampaignTypeValue {
  return (campaignTypeValues as readonly string[]).includes(value);
}

export const createCampaignSchema = z.object({
  name: z.string().trim().min(3, "Informe um nome com pelo menos 3 caracteres"),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  type: z.enum(campaignTypeValues),
  startDate: z.string().datetime().optional().or(z.literal("")),
  endDate: z.string().datetime().optional().or(z.literal("")),
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;

export const updateCampaignSchema = z.object({
  name: z.string().trim().min(3).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  type: z.enum(campaignTypeValues).optional(),
  status: z.enum(campaignStatusValues).optional(),
  startDate: z.string().datetime().nullable().optional(),
  endDate: z.string().datetime().nullable().optional(),
  sellersNotifyWebhookUrl: z
    .union([
      z
        .string()
        .trim()
        .url("Informe uma URL válida")
        .refine((value) => value.startsWith("http://") || value.startsWith("https://"), {
          message: "A URL do webhook precisa começar com http:// ou https://",
        }),
      z.literal(""),
      z.null(),
    ])
    .optional(),
});

export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;

export const addCampaignAgentSchema = z.object({
  userId: z.string().min(1),
});

export type AddCampaignAgentInput = z.infer<typeof addCampaignAgentSchema>;

export const updateCampaignAgentSchema = z.object({
  active: z.boolean(),
});

export type UpdateCampaignAgentInput = z.infer<typeof updateCampaignAgentSchema>;
