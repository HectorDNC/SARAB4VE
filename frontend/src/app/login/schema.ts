import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Correo electrónico inválido"),

  password: z
    .string()
    .min(1, "Ingresa tu contraseña"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export function getFieldErrors(data: unknown): Partial<Record<keyof LoginFormData, string>> {
  const result = loginSchema.safeParse(data);
  if (result.success) return {};

  const errors: Partial<Record<keyof LoginFormData, string>> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as keyof LoginFormData;
    if (!errors[field]) {
      errors[field] = issue.message;
    }
  }
  return errors;
}