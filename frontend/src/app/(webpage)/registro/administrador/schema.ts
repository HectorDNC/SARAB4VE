import { z } from "zod";
import { isValidPhoneNumber } from "libphonenumber-js";

export const adminSchema = z.object({
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

    adminSecret: z
        .string()
        .trim()
        .min(3, "La palabra secreta debe tener al menos 3 caracteres")
        .max(100, "La palabra secreta es demasiado larga"),
});

export type adminFormData = z.infer<typeof adminSchema>;

export function getFieldErrors(data: unknown): Partial<Record<keyof adminFormData, string>> {
    const result = adminSchema.safeParse(data);
    if (result.success) return {};

    const errors: Partial<Record<keyof adminFormData, string>> = {};
    for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof adminFormData;
        if (!errors[field]) {
            errors[field] = issue.message;
        }
    }
    return errors;
}