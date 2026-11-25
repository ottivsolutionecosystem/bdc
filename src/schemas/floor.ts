import { z } from "zod";

export const fairEventStatusValues = ["DRAFT", "ACTIVE", "CLOSED"] as const;
export const entryChannelValues = ["WALK_IN", "CAMPAIGN", "RETURN"] as const;
export const awarenessValues = [
  "INSTAGRAM",
  "RADIO",
  "REFERRAL",
  "OUTDOOR",
  "WHATSAPP",
  "CALL_CAMPAIGN",
  "PASSING_BY",
  "OTHER",
] as const;
export const arrivalModeValues = ["OWN_CAR", "RIDESHARE", "BUS", "WALK", "RIDE", "OTHER"] as const;

const optionalText = z.string().trim().max(200).optional().or(z.literal(""));

export const createFairEventSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do feirão"),
  location: optionalText,
  startsAt: z.string().optional().or(z.literal("")),
  endsAt: z.string().optional().or(z.literal("")),
  campaignId: z.string().optional().or(z.literal("")),
  status: z.enum(fairEventStatusValues).optional(),
});

export const updateFairEventSchema = z.object({
  name: z.string().trim().min(2).optional(),
  location: z.string().trim().max(200).nullable().optional(),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
  status: z.enum(fairEventStatusValues).optional(),
});

export const createFairVehicleSchema = z.object({
  brand: z.string().trim().min(1, "Informe a marca"),
  model: z.string().trim().min(1, "Informe o modelo"),
  version: optionalText,
  year: z.number().int().min(1950).max(2100).nullable().optional(),
  plate: optionalText,
  color: optionalText,
  priceReais: z.number().min(0).nullable().optional(),
  condition: optionalText,
  transmission: optionalText,
  bodyType: optionalText,
  mileageKm: z.number().int().min(0).max(2_000_000).nullable().optional(),
  onPromotion: z.boolean().optional(),
});

export const updateFairVehicleSchema = z.object({
  active: z.boolean().optional(),
  priceReais: z.number().min(0).nullable().optional(),
});

export const checkInSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome"),
  phone: z.string().trim().min(8, "Informe o telefone"),
  document: z.string().trim().max(20).optional().or(z.literal("")),
  email: z.string().trim().email("E-mail inválido").optional().or(z.literal("")),
  companionCount: z.number().int().min(0).max(30),
  entryChannel: z.enum(entryChannelValues).optional().default("WALK_IN"),
  awarenessSource: z.enum(awarenessValues),
  arrivalMode: z.enum(arrivalModeValues).optional().default("OWN_CAR"),
  sellerId: z.string().min(1, "Selecione o vendedor"),
  receptionistId: z.string().min(1, "Selecione a recepcionista"),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const updateInterestsSchema = z.object({
  interests: z
    .array(
      z.object({
        vehicleId: z.string().min(1),
        primary: z.boolean(),
      })
    )
    .max(30),
});

export const requestAppraisalSchema = z.object({
  plate: z.string().trim().min(7, "Informe a placa").max(8),
});

const tireCondition = z.enum(["GOOD", "HALF", "REPLACE"]).nullable().optional();

export const saveAppraisalSchema = z.object({
  plate: z.string().trim().min(7).max(8),
  brand: optionalText,
  model: optionalText,
  year: z.number().int().min(1950).max(2100).nullable().optional(),
  fipeValueReais: z.number().min(0).nullable().optional(),
  offerValueReais: z.number().min(0).nullable().optional(),
  preparationCostReais: z.number().min(0).nullable().optional(),
  costs: z
    .array(
      z.object({
        kind: z.enum(["DAMAGE", "MECHANICAL"]),
        label: z.string().trim().max(80),
        costReais: z.number().min(0).nullable(),
      }),
    )
    .max(40)
    .optional(),
  damages: z
    .array(
      z.object({
        photoId: z.string().min(1),
        caption: z.string().trim().max(80),
        costReais: z.number().min(0).nullable(),
      }),
    )
    .max(15)
    .optional(),
  tireFrontLeft: tireCondition,
  tireFrontRight: tireCondition,
  tireRearLeft: tireCondition,
  tireRearRight: tireCondition,
  notes: z.string().trim().max(4000).optional().or(z.literal("")),
  finish: z.boolean().optional(),
});

export const closeDealSchema = z.object({
  bankName: z.string().trim().min(2, "Informe o banco").max(80),
  vehicleId: z.string().trim().min(1, "Selecione o veículo que foi fechado"),
  atEvent: z.boolean(),
  pickupOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
});

export const loseVisitSchema = z.object({
  lostReason: z.string().trim().min(2, "Informe o motivo").max(500),
});

export const handoffVisitSchema = z.object({
  targetUserId: z.string().min(1, "Selecione quem vai receber"),
});

export const fairTaskStatusValues = ["PENDING", "IN_PROGRESS", "WAITING", "BLOCKED", "DONE", "CANCELED"] as const;
export const fairTaskPriorityValues = ["LOW", "NORMAL", "HIGH", "CRITICAL"] as const;

const optionalDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional()
  .or(z.literal(""));

export const createFairTaskSchema = z.object({
  title: z.string().trim().min(2, "Informe a tarefa").max(160),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  area: optionalText,
  ownerNames: z.array(z.string().trim().min(1).max(120)).max(20).optional(),
  startsOn: optionalDate,
  dueOn: optionalDate,
  priority: z.enum(fairTaskPriorityValues).optional(),
  status: z.enum(fairTaskStatusValues).optional(),
});

const nullableDate = z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal(""), z.null()]).optional();

export const updateFairTaskSchema = createFairTaskSchema.partial().extend({
  updatedAt: z.string().optional(),
  ownerNames: z.array(z.string().trim().min(1).max(120)).max(20).optional(),
  startsOn: nullableDate,
  dueOn: nullableDate,
  description: z.string().trim().max(2000).nullable().optional(),
  area: z.string().trim().max(200).nullable().optional(),
});

export const createFairExpenseSchema = z.object({
  title: z.string().trim().min(2, "Informe o gasto").max(160),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  plannedReais: z.number().min(0).nullable().optional(),
  actualReais: z.number().min(0).nullable().optional(),
  spentOn: optionalDate,
});

export const updateFairExpenseSchema = z.object({
  title: z.string().trim().min(2).max(160).optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  plannedReais: z.number().min(0).nullable().optional(),
  actualReais: z.number().min(0).nullable().optional(),
  spentOn: nullableDate,
  updatedAt: z.string().optional(),
});

export const updateFairProjectionSchema = z.object({
  vehicleGoal: z.number().int().min(0).nullable().optional(),
  budgetReais: z.number().min(0).nullable().optional(),
  captureGoalReais: z.number().min(0).nullable().optional(),
  capturedReais: z.number().min(0).nullable().optional(),
});

export type SaveAppraisalInput = z.infer<typeof saveAppraisalSchema>;
export type CloseDealInput = z.infer<typeof closeDealSchema>;
export type CheckInInput = z.infer<typeof checkInSchema>;
export type CreateFairEventInput = z.infer<typeof createFairEventSchema>;
export type CreateFairVehicleInput = z.infer<typeof createFairVehicleSchema>;
export type CreateFairTaskInput = z.infer<typeof createFairTaskSchema>;
export type UpdateFairTaskInput = z.infer<typeof updateFairTaskSchema>;
export type CreateFairExpenseInput = z.infer<typeof createFairExpenseSchema>;
export type UpdateFairExpenseInput = z.infer<typeof updateFairExpenseSchema>;
export type UpdateFairProjectionInput = z.infer<typeof updateFairProjectionSchema>;
