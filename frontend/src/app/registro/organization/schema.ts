import { z } from "zod";
import { isValidPhoneNumber } from "libphonenumber-js";

export const organizationSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, "El nombre del representante debe tener al menos 3 caracteres")
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
    .min(2, "Ingresa una zona de cobertura válida"),

  organizationName: z
    .string()
    .trim()
    .min(2, "Ingresa el nombre de la organización"),

  legalDocument: z
    .string()
    .trim()
    .min(5, "Ingresa un documento legal válido (RIF o equivalente)"),

  workArea: z
    .array(z.string())
    .min(1, "Selecciona al menos un área de trabajo"),

  acceptedTerms: z
    .literal(true, {
      error: "Debes aceptar los términos y el código de conducta",
    }),
});

export type OrganizationFormData = z.infer<typeof organizationSchema>;

export function getFieldErrors(data: unknown): Partial<Record<keyof OrganizationFormData, string>> {
  const result = organizationSchema.safeParse(data);
  if (result.success) return {};

  const errors: Partial<Record<keyof OrganizationFormData, string>> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as keyof OrganizationFormData;
    if (!errors[field]) {
      errors[field] = issue.message;
    }
  }
  return errors;
}