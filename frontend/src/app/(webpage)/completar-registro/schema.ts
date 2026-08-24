import { z } from "zod";

export const completarRegistroSchema = z
  .object({
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
    confirmPassword: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export type CompletarRegistroFormData = z.infer<typeof completarRegistroSchema>;

export function getFieldErrors(
  data: unknown
): Partial<Record<keyof CompletarRegistroFormData, string>> {
  const result = completarRegistroSchema.safeParse(data);
  if (result.success) return {};

  const errors: Partial<Record<keyof CompletarRegistroFormData, string>> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as keyof CompletarRegistroFormData;
    if (!errors[field]) errors[field] = issue.message;
  }
  return errors;
}
