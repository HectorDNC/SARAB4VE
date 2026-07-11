import { z } from "zod";
import { isValidPhoneNumber } from "libphonenumber-js";

export const volunteerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, "El nombre debe tener al menos 3 caracteres")
    .max(100, "El nombre es demasiado largo"),

  email: z
    .string()
    .trim()
    .email("Correo electrónico inválido"),

  phone: z
    .string()
    .trim()
    .refine((val) => isValidPhoneNumber(val), {
      message: "Ingresa un número de teléfono válido para el país seleccionado",
    }),

  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres"),

  location: z
    .object({
      lat: z.number(),
      lng: z.number(),
    })
    .nullable()
    .refine((val) => val !== null, "Selecciona tu ubicación en el mapa"),

  zone: z
    .string()
    .trim()
    .min(2, "Ingresa una zona válida"),

  skills: z
    .array(z.string())
    .min(1, "Selecciona al menos una habilidad"),

  availableHours: z
    .number()
    .min(1, "Ingresa al menos 1 hora disponible")
    .max(168, "No puede superar las 168 horas semanales"),

  availableDays: z
    .array(z.string())
    .min(1, "Selecciona al menos un día disponible"),

  acceptedTerms: z
    .literal(true, {
      error: () => ({ message: "Debes aceptar los términos y el código de conducta" }),
    }),
});

export type VolunteerFormData = z.infer<typeof volunteerSchema>;

export function getFieldErrors(data: unknown): Partial<Record<keyof VolunteerFormData, string>> {
  const result = volunteerSchema.safeParse(data);
  if (result.success) return {};

  const errors: Partial<Record<keyof VolunteerFormData, string>> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as keyof VolunteerFormData;
    if (!errors[field]) {
      errors[field] = issue.message;
    }
  }
  return errors;
}