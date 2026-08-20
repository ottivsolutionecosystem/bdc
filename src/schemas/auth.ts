import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().min(1, "Informe o e-mail").email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, "Informe o e-mail").email("E-mail inválido"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Informe a senha atual"),
  password: z.string().min(8, "A nova senha precisa ter pelo menos 8 caracteres"),
});

export type LoginInput = z.infer<typeof loginSchema>;
