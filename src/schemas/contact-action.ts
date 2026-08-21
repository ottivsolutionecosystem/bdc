import { z } from "zod";

const contactIdsSchema = z.array(z.string().cuid()).min(1).max(200);

const noteSchema = z.string().trim().max(500).optional();

export const reopenContactsSchema = z.object({
  contactIds: contactIdsSchema,
  nextContactAt: z.string().datetime().optional(),
  note: noteSchema,
});

export const requeueContactsSchema = z.object({
  contactIds: contactIdsSchema,
  toUserId: z.string().cuid().optional(),
  nextContactAt: z.string().datetime().optional(),
  note: noteSchema,
});

export const updateContactDispositionSchema = z.object({
  dispositionId: z.string().cuid(),
});

export type ReopenContactsInput = z.infer<typeof reopenContactsSchema>;
export type RequeueContactsInput = z.infer<typeof requeueContactsSchema>;
export type UpdateContactDispositionInput = z.infer<typeof updateContactDispositionSchema>;
