import { z } from "zod";
import { isValidPhoneNumber } from "libphonenumber-js";
import { COUNTRIES_FISCAL_ID, ENTITY_TYPES, DISABILITY_TYPES } from "./constants";


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
    .optional(),

  workArea: z
    .array(z.string())
    .optional(),

  // NUEVOS CAMPOS: Identificación Fiscal
  countryFiscal: z
    .string()
    .min(1, "Selecciona un país para el identificador fiscal"),

  fiscalIdType: z
    .string()
    .min(1, "Selecciona el tipo de identificador fiscal"),

  fiscalNumber: z
    .string()
    .trim()
    .min(5, "Ingresa un número de identificación fiscal válido"),

  // NUEVOS CAMPOS: Tipo de Entidad
  entityType: z
    .string()
    .min(1, "Selecciona un tipo de entidad"),

  otherEntityType: z
    .string()
    .trim()
    .optional(),

  // DATOS LEGALES
  registrationNumber: z
    .number()
    .min(1, "Ingresa un número de registro válido"),

  constitutionDate: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), "Ingresa una fecha válida"),

  legalAddress: z
    .string()
    .trim()
    .min(5, "Ingresa una dirección válida"),

  legalCountry: z
    .string()
    .min(1, "Selecciona un país"),

  province: z
    .string()
    .trim()
    .min(2, "Ingresa una provincia válida"),

  city: z
    .string()
    .trim()
    .min(2, "Ingresa una ciudad válida"),

  // REPRESENTANTE LEGAL
  legalRepresentativeName: z
    .string()
    .trim()
    .min(3, "Ingresa el nombre del representante legal"),

  legalRepresentativePosition: z
    .string()
    .trim()
    .min(2, "Ingresa el cargo válido"),

  legalRepresentativePhone: z
    .string()
    .trim()
    .refine((val) => isValidPhoneNumber(val), {
      message: "Ingresa un número de teléfono válido",
    }),

  legalRepresentativeEmail: z
    .string()
    .trim()
    .email("Ingresa un correo electrónico válido"),

  // INFORMACIÓN INSTITUCIONAL
  website: z
    .string()
    .url("Ingresa una URL válida")
    .optional()
    .or(z.literal("")),

  socialMedia: z
    .string()
    .trim()
    .optional(),

  mission: z
    .string()
    .trim()
    .min(10, "Ingresa una misión más descriptiva"),

  vision: z
    .string()
    .trim()
    .min(10, "Ingresa una visión más descriptiva"),

  scope: z
    .string()
    .trim()
    .min(10, "Describe el ámbito de actuación"),

  collectiveServed: z
    .string()
    .trim()
    .min(10, "Describe los colectivos atendidos"),

  // TIPOS DE DISCAPACIDAD
  disabilityTypes: z
    .array(z.string())
    .min(1, "Selecciona al menos un tipo de discapacidad"),

  // SERVICIOS OFRECIDOS
  services: z
    .string()
    .trim()
    .min(10, "Describe los servicios ofrecidos con más detalle"),


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