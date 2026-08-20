import { z } from "zod";

export const userRoleValues = ["ADMIN", "SUPERVISOR", "AGENT", "SELLER"] as const;

export const createUserSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome"),
  email: z.string().trim().email("E-mail inválido").transform((value) => value.toLowerCase()),
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres"),
  role: z.enum(userRoleValues),
  active: z.boolean().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  name: z.string().trim().min(2).optional(),
  email: z
    .string()
    .trim()
    .email("E-mail inválido")
    .transform((value) => value.toLowerCase())
    .optional(),
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres").optional().or(z.literal("")),
  role: z.enum(userRoleValues).optional(),
  active: z.boolean().optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
