/**
 * Esquema — schemas Zod + normalización para el dominio de auth.
 *
 * Cada DTO se define una sola vez como schema Zod. El mismo schema:
 *   1. Valida el request body en el controller (safeParse)
 *   2. Genera la documentación OpenAPI automáticamente (.openapi())
 *
 * Las funciones normalize* se conservan porque el servicio las necesita
 * para agregar campos derivados (role, status) antes del INSERT.
 */
const { z } = require("zod");
const { extendZodWithOpenApi } = require("@asteasolutions/zod-to-openapi");

// Extender Zod con el método .openapi() — requerido por zod-to-openapi v8+
extendZodWithOpenApi(z);

// ---------------------------------------------------------------------------
// Constantes (sin cambios)
// ---------------------------------------------------------------------------

/** Roles válidos en el sistema. */
const ROLES = ["citizen", "volunteer", "organization", "admin"];

/** Días de la semana aceptados para available_days. */
const VALID_DAYS = [
  "lunes",
  "martes",
  "miercoles",
  "miércoles",
  "jueves",
  "viernes",
  "sabado",
  "sábado",
  "domingo",
];

const VALID_DAYS_SET = new Set(VALID_DAYS);

/** Estados iniciales según el rol. */
const INITIAL_STATUS = {
  citizen: "approved",
  volunteer: "pending",
  organization: "pending",
  admin: "approved",
};

// ---------------------------------------------------------------------------
// Schemas reutilizables (sub-schemas compartidos entre DTOs)
// ---------------------------------------------------------------------------

/**
 * Coordenadas geográficas { lat, lng }.
 * Se usa como sub-schema en todos los DTOs de registro.
 */
const LocationSchema = z.object({
  lat: z.number()
    .min(-90, "location.lat debe ser una coordenada válida (-90 a 90)")
    .max(90, "location.lat debe ser una coordenada válida (-90 a 90)"),
  lng: z.number()
    .min(-180, "location.lng debe ser una coordenada válida (-180 a 180)")
    .max(180, "location.lng debe ser una coordenada válida (-180 a 180)"),
}).openapi({ description: "Coordenadas geográficas del usuario" });

/**
 * Campos comunes a todos los registros (fullName, email, phone, password,
 * location, zone). Se extiende con .extend() en cada DTO.
 */
const CommonFields = z.object({
  fullName: z.string()
    .min(1, "fullName es requerido")
    .openapi({ example: "María González", description: "Nombre completo" }),

  email: z.string()
    .min(1, "email es requerido")
    .email("email no tiene un formato válido")
    .openapi({ example: "maria@email.com", description: "Correo electrónico" }),

  phone: z.string()
    .min(1, "phone es requerido")
    .refine(
      (val) => /^\+?[0-9]{7,15}$/.test(val.replace(/[\s-]/g, "")),
      "phone no tiene un formato válido (mínimo 7 dígitos)",
    )
    .openapi({ example: "+584241234567", description: "Teléfono (formato internacional o local)" }),

  password: z.string()
    .min(8, "password debe tener al menos 8 caracteres")
    .openapi({ example: "unaClaveSegura2024!", description: "Contraseña (mín. 8 caracteres)" }),

  location: LocationSchema.nullable().optional()
    .openapi({ description: "Ubicación geográfica (opcional)" }),

  zone: z.string().optional()
    .openapi({ example: "Caracas - Zona 1", description: "Zona o sector (opcional)" }),
});

// ---------------------------------------------------------------------------
// POST /api/auth/register/citizen
// ---------------------------------------------------------------------------

const RegisterCitizenBody = CommonFields.extend({}).openapi({
  description: "Payload para registrar un ciudadano (aprobación automática)",
  example: {
    fullName: "María González",
    email: "maria@email.com",
    phone: "+584241234567",
    password: "unaClaveSegura2024!",
    location: { lat: 10.4806, lng: -66.9036 },
    zone: "Caracas - Zona 1",
  },
});

// ---------------------------------------------------------------------------
// POST /api/auth/register/volunteer
// ---------------------------------------------------------------------------

const RegisterVolunteerBody = CommonFields.extend({
  skills: z.array(z.string().min(1, "skills contiene valores vacíos"))
    .min(1, "skills es requerido y debe contener al menos una habilidad")
    .openapi({
      example: ["primeros_auxilios", "logistica", "traduccion_lsen"],
      description: "Habilidades del voluntario",
    }),

  availableHours: z.number()
    .int("availableHours debe ser un número entero")
    .min(1, "availableHours debe ser al menos 1")
    .max(168, "availableHours no puede exceder 168 (horas en una semana)")
    .openapi({ example: 20, description: "Horas disponibles por semana (1-168)" }),

  availableDays: z.array(
    z.string().refine((d) => VALID_DAYS_SET.has(d?.toLowerCase?.() ?? ""), {
      message: "availableDays contiene valores inválidos. Válidos: " + VALID_DAYS.join(", "),
    }),
  )
    .min(1, "availableDays es requerido y debe contener al menos un día")
    .openapi({
      example: ["lunes", "miercoles", "sabado"],
      description: "Días de la semana disponibles",
    }),

  acceptedTerms: z.literal(true, {
    errorMap: () => ({ message: "acceptedTerms debe ser true para registrarse como voluntario" }),
  }).openapi({ example: true, description: "Debe ser true" }),
}).openapi({
  description: "Payload para registrar un voluntario (requiere aprobación)",
  example: {
    fullName: "Carlos Pérez",
    email: "voluntario@sara.org",
    phone: "+584241112233",
    password: "claveSegura2024!",
    location: { lat: 10.4806, lng: -66.9036 },
    zone: "Caracas - Zona 1",
    skills: ["primeros_auxilios", "logistica"],
    availableHours: 20,
    availableDays: ["lunes", "miercoles", "sabado"],
    acceptedTerms: true,
  },
});

// ---------------------------------------------------------------------------
// POST /api/auth/register/organization
// ---------------------------------------------------------------------------

const RegisterOrganizationBody = CommonFields.extend({
  organizationName: z.string()
    .min(1, "organizationName es requerido para organizaciones")
    .openapi({ example: "Cruz Roja Venezolana", description: "Nombre de la organización" }),

  legalDocument: z.string()
    .min(1, "legalDocument es requerido para organizaciones")
    .openapi({ example: "RIF-J-12345678-9", description: "Documento legal (RIF, cédula jurídica)" }),

  workArea: z.array(z.string().min(1, "workArea contiene valores vacíos"))
    .optional()
    .openapi({
      example: ["salud", "logistica", "alimentos"],
      description: "Áreas de trabajo (opcional)",
    }),

  acceptedTerms: z.literal(true, {
    errorMap: () => ({ message: "acceptedTerms debe ser true para registrarse como organización" }),
  }).openapi({ example: true, description: "Debe ser true" }),
}).openapi({
  description: "Payload para registrar una organización (requiere aprobación)",
  example: {
    fullName: "Ana Rodríguez",
    email: "contacto@cruzroja.org.ve",
    phone: "+582121234567",
    password: "claveOrg2024!",
    location: { lat: 10.4806, lng: -66.9036 },
    zone: "Caracas - Centro",
    organizationName: "Cruz Roja Venezolana",
    legalDocument: "RIF-J-12345678-9",
    workArea: ["salud", "logistica"],
    acceptedTerms: true,
  },
});

// ---------------------------------------------------------------------------
// POST /api/auth/register/admin
// ---------------------------------------------------------------------------

const RegisterAdminBody = CommonFields.extend({
  adminSecret: z.string()
    .min(1, "adminSecret es requerido para registrar un administrador")
    .openapi({
      example: "******",
      description: "Secreto de administrador configurado en el servidor",
    }),
}).openapi({
  description: "Payload para registrar un administrador (protegido por ADMIN_SECRET)",
  example: {
    fullName: "Admin Principal",
    email: "admin@sara.org",
    phone: "+584249990000",
    password: "adminClaveSegura2024!",
    location: { lat: 10.4806, lng: -66.9036 },
    zone: "Caracas - Oficina Central",
    adminSecret: "******",
  },
});

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------

const LoginBody = z.object({
  email: z.string()
    .min(1, "email es requerido")
    .email("email no tiene un formato válido")
    .openapi({ example: "maria@email.com", description: "Correo electrónico registrado" }),

  password: z.string()
    .min(1, "password es requerido")
    .openapi({ example: "unaClaveSegura2024!", description: "Contraseña" }),
}).openapi({
  description: "Credenciales de inicio de sesión",
  example: {
    email: "maria@email.com",
    password: "unaClaveSegura2024!",
  },
});

// ---------------------------------------------------------------------------
// Schemas de respuesta (para documentación OpenAPI)
// ---------------------------------------------------------------------------

/** Envoltura estándar de error: { errors: [...] } */
const ErrorResponse = z.object({
  errors: z.array(z.string()).openapi({ example: ["email es requerido"] }),
}).openapi({ description: "Respuesta de error con lista de mensajes" });

/** Usuario sin password_hash (respuesta de registro y GET /me) */
const UserProfile = z.object({
  id: z.string().uuid().openapi({ example: "550e8400-e29b-41d4-a716-446655440000" }),
  full_name: z.string().openapi({ example: "María González" }),
  email: z.string().email().openapi({ example: "maria@email.com" }),
  phone: z.string().openapi({ example: "+584241234567" }),
  role: z.enum(ROLES).openapi({ example: "citizen" }),
  status: z.string().openapi({ example: "approved" }),
  location: LocationSchema.nullable().optional(),
  zone: z.string().nullable().optional().openapi({ example: "Caracas - Zona 1" }),
  phone_verified: z.boolean().openapi({ example: false }),
  email_verified: z.boolean().openapi({ example: false }),
  created_at: z.string().datetime().openapi({ example: "2024-01-15T10:30:00.000Z" }),
  updated_at: z.string().datetime().openapi({ example: "2024-01-15T10:30:00.000Z" }),
}).openapi({ description: "Perfil de usuario sin datos sensibles" });

/** Respuesta de login: { token, user } */
const LoginResponse = z.object({
  data: z.object({
    token: z.string().openapi({
      example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      description: "JWT para usar en Authorization: Bearer <token>",
    }),
    user: UserProfile,
  }),
}).openapi({ description: "Token JWT + perfil del usuario" });

// ---------------------------------------------------------------------------
// Normalizadores (SIN cambios — los servicios dependen de ellos)
// ---------------------------------------------------------------------------

/**
 * Normaliza el payload de registro de ciudadano para inserción en DB.
 * @param {Object} payload — ya validado por Zod
 * @returns {{ user: Object }}
 */
function normalizeRegisterCitizen(payload) {
  return {
    user: {
      fullName: payload.fullName.trim(),
      email: payload.email.trim().toLowerCase(),
      phone: payload.phone.trim().replace(/[\s-]/g, ""),
      password: payload.password, // Se hashea en el servicio
      role: "citizen",
      status: "approved",
      location: payload.location || null,
      zone: payload.zone?.trim() || null,
    },
  };
}

/**
 * Normaliza el payload de registro de voluntario para inserción en DB.
 * @param {Object} payload — ya validado por Zod
 * @returns {{ user: Object, details: Object }}
 */
function normalizeRegisterVolunteer(payload) {
  return {
    user: {
      fullName: payload.fullName.trim(),
      email: payload.email.trim().toLowerCase(),
      phone: payload.phone.trim().replace(/[\s-]/g, ""),
      password: payload.password,
      role: "volunteer",
      status: "pending",
      location: payload.location || null,
      zone: payload.zone?.trim() || null,
    },
    details: {
      skills: payload.skills.map((s) => s.trim()),
      availableHours: Number(payload.availableHours),
      availableDays: payload.availableDays.map((d) => d.toLowerCase().trim()),
      acceptedTerms: true,
    },
  };
}

/**
 * Normaliza el payload de registro de organización para inserción en DB.
 * @param {Object} payload — ya validado por Zod
 * @returns {{ user: Object, details: Object }}
 */
function normalizeRegisterOrganization(payload) {
  return {
    user: {
      fullName: payload.fullName.trim(),
      email: payload.email.trim().toLowerCase(),
      phone: payload.phone.trim().replace(/[\s-]/g, ""),
      password: payload.password,
      role: "organization",
      status: "pending",
      location: payload.location || null,
      zone: payload.zone?.trim() || null,
    },
    details: {
      organizationName: payload.organizationName.trim(),
      legalDocument: payload.legalDocument.trim(),
      workArea: payload.workArea?.map((a) => a.trim()) || null,
      acceptedTerms: true,
    },
  };
}

/**
 * Normaliza el payload de registro de administrador para inserción en DB.
 * No se crea fila en user_details (igual que citizen).
 * @param {Object} payload — ya validado por Zod
 * @returns {{ user: Object }}
 */
function normalizeRegisterAdmin(payload) {
  return {
    user: {
      fullName: payload.fullName.trim(),
      email: payload.email.trim().toLowerCase(),
      phone: payload.phone.trim().replace(/[\s-]/g, ""),
      password: payload.password,
      role: "admin",
      status: "approved",
      location: payload.location || null,
      zone: payload.zone?.trim() || null,
    },
  };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  // Constantes
  ROLES,
  VALID_DAYS,
  VALID_DAYS_SET,
  INITIAL_STATUS,

  // Schemas Zod para validación 
  RegisterCitizenBody,
  RegisterVolunteerBody,
  RegisterOrganizationBody,
  RegisterAdminBody,
  LoginBody,

  // Schemas de respuesta para OpenAPI 
  UserProfile,
  LoginResponse,
  ErrorResponse,
  LocationSchema,

  // Normalizadores
  normalizeRegisterCitizen,
  normalizeRegisterVolunteer,
  normalizeRegisterOrganization,
  normalizeRegisterAdmin,
};
