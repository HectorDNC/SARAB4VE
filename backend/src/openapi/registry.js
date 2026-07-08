/**
 * Registro central de OpenAPI para SARA.
 *
 * Todos los schemas Zod del proyecto se importan aquí, se extienden con
 * .openapi() (ejemplos, descripciones) y se registran en el OpenAPIRegistry.
 *
 * Cada endpoint se documenta con:
 *   - method, path, tags
 *   - request body/params/query schemas
 *   - responses (éxito, error de validación, auth, conflictos)
 *   - security (bearerAuth para rutas protegidas)
 */
const { OpenAPIRegistry, extendZodWithOpenApi } = require("@asteasolutions/zod-to-openapi");
const { z } = require("zod");

// Extender Zod con el método .openapi() — requerido por zod-to-openapi v8+
extendZodWithOpenApi(z);

// ---------------------------------------------------------------------------
// Schemas del módulo auth (ya tienen .openapi() definido en auth.schema.js)
// ---------------------------------------------------------------------------
const {
  RegisterCitizenBody,
  RegisterVolunteerBody,
  RegisterOrganizationBody,
  RegisterAdminBody,
  LoginBody,
  UserProfile,
  LoginResponse,
  ErrorResponse,
} = require("../modules/auth/auth.schema");

// ---------------------------------------------------------------------------
// Schemas para módulos que aún no están migrados a Zod
// (solo se usan para documentación OpenAPI, no para validación en runtime)
// ---------------------------------------------------------------------------

/** POST /api/help-requests — body */
const HelpRequestCreateBody = z.object({
  requesterName: z.string().min(1).openapi({
    example: "Pedro López", description: "Nombre del solicitante",
  }),
  contactMethod: z.string().min(1).openapi({
    example: "whatsapp", description: "Método de contacto preferido",
  }),
  contactValue: z.string().min(1).openapi({
    example: "+584241112233", description: "Valor de contacto (teléfono, email)",
  }),
  needType: z.enum([
    "equipment", "medication", "transport", "companionship",
    "interpreter", "accessible_information", "neurodivergent_support",
    "psychosocial_support",
  ]).openapi({ example: "medication", description: "Tipo de necesidad" }),
  description: z.string().min(1).openapi({
    example: "Necesito medicación para la presión arterial",
    description: "Descripción detallada de la necesidad",
  }),
  latitude: z.number().min(-90).max(90).openapi({
    example: 10.4806, description: "Latitud en grados decimales",
  }),
  longitude: z.number().min(-180).max(180).openapi({
    example: -66.9036, description: "Longitud en grados decimales",
  }),
  urgency: z.enum(["low", "medium", "high", "critical"]).optional().openapi({
    example: "high", description: "Nivel de urgencia (default: medium)",
  }),
}).openapi({ description: "Payload para crear una solicitud de ayuda" });

/** POST /api/help-requests/:id/accept — body */
const AcceptHelpRequestBody = z.object({
  volunteerId: z.string().uuid().optional().openapi({
    example: "550e8400-e29b-41d4-a716-446655440000",
    description: "ID del voluntario que acepta (opcional, se usa req.user si no se envía)",
  }),
}).openapi({ description: "Payload para aceptar una solicitud" });

/** POST /api/emergencies — body */
const EmergencyCreateBody = z.object({
  requesterName: z.string().optional().openapi({
    example: "Persona anónima", description: "Nombre de quien reporta (opcional)",
  }),
  disabilityType: z.enum(["visual", "auditiva", "neuro", "motriz"]).openapi({
    example: "motriz", description: "Tipo de discapacidad",
  }),
  communicationMode: z.enum([
    "lengua_senas", "audifono", "implante_coclear", "vibrador_oseo",
  ]).optional().openapi({ example: "lengua_senas", description: "Modo de comunicación" }),
  disabilitySubcategory: z.string().optional().openapi({
    example: "silla_ruedas", description: "Subcategoría de discapacidad",
  }),
  needType: z.string().min(1).openapi({
    example: "Evacuación de emergencia", description: "Tipo de necesidad",
  }),
  description: z.string().min(1).openapi({
    example: "Persona en silla de ruedas atrapada en 2do piso sin ascensor",
    description: "Descripción de la emergencia",
  }),
  latitude: z.number().min(-90).max(90).openapi({
    example: 10.4806, description: "Latitud en grados decimales",
  }),
  longitude: z.number().min(-180).max(180).openapi({
    example: -66.9036, description: "Longitud en grados decimales",
  }),
  urgency: z.enum(["low", "medium", "high", "critical"]).optional().openapi({
    example: "critical", description: "Nivel de urgencia (default: medium)",
  }),
}).openapi({ description: "Payload para crear una emergencia SOS accesible" });

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const registry = new OpenAPIRegistry();

// ── Security Scheme (bearerAuth JWT) ─────────────────────────────────────

registry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
  description: [
    "Token JWT obtenido en POST /api/auth/login.",
    "En Swagger UI, haz clic en **Authorize** y pega solo el token (sin 'Bearer ').",
  ].join(" "),
});

// ── Schemas reutilizables ─────────────────────────────────────────────────

registry.register("ErrorResponse", ErrorResponse);
registry.register("UserProfile", UserProfile);

// =========================================================================
// AUTH — Registro
// =========================================================================

registry.registerPath({
  method: "post",
  path: "/api/auth/register/citizen",
  summary: "Registrar ciudadano",
  description: "Registra un nuevo ciudadano con aprobación automática. No requiere autenticación previa.",
  tags: ["Auth"],
  request: {
    body: {
      content: { "application/json": { schema: RegisterCitizenBody } },
      description: "Datos del ciudadano",
      required: true,
    },
  },
  responses: {
    201: {
      description: "Ciudadano registrado exitosamente",
      content: { "application/json": { schema: z.object({ data: UserProfile }) } },
    },
    400: {
      description: "Error de validación (campos requeridos, formato inválido)",
      content: { "application/json": { schema: ErrorResponse } },
    },
    409: {
      description: "Conflicto — email o teléfono ya registrado",
      content: { "application/json": { schema: ErrorResponse } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/auth/register/volunteer",
  summary: "Registrar voluntario",
  description: [
    "Registra un nuevo voluntario.",
    "Requiere habilidades, disponibilidad horaria y aceptación de términos.",
    "Queda en estado 'pending' hasta que un administrador apruebe la cuenta.",
  ].join(" "),
  tags: ["Auth"],
  request: {
    body: {
      content: { "application/json": { schema: RegisterVolunteerBody } },
      description: "Datos del voluntario",
      required: true,
    },
  },
  responses: {
    201: {
      description: "Voluntario registrado (pendiente de aprobación)",
      content: { "application/json": { schema: z.object({ data: UserProfile }) } },
    },
    400: {
      description: "Error de validación",
      content: { "application/json": { schema: ErrorResponse } },
    },
    409: {
      description: "Conflicto — email o teléfono ya registrado",
      content: { "application/json": { schema: ErrorResponse } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/auth/register/organization",
  summary: "Registrar organización",
  description: [
    "Registra una nueva organización humanitaria.",
    "Requiere datos legales (nombre, documento).",
    "Queda en estado 'pending' hasta que un administrador apruebe la cuenta.",
  ].join(" "),
  tags: ["Auth"],
  request: {
    body: {
      content: { "application/json": { schema: RegisterOrganizationBody } },
      description: "Datos de la organización",
      required: true,
    },
  },
  responses: {
    201: {
      description: "Organización registrada (pendiente de aprobación)",
      content: { "application/json": { schema: z.object({ data: UserProfile }) } },
    },
    400: {
      description: "Error de validación",
      content: { "application/json": { schema: ErrorResponse } },
    },
    409: {
      description: "Conflicto — email o teléfono ya registrado",
      content: { "application/json": { schema: ErrorResponse } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/auth/register/admin",
  summary: "Registrar administrador",
  description: [
    "Registra un nuevo administrador.",
    "Protegido por ADMIN_SECRET — el payload debe incluir el secreto",
    "configurado en el servidor.",
  ].join(" "),
  tags: ["Auth"],
  request: {
    body: {
      content: { "application/json": { schema: RegisterAdminBody } },
      description: "Datos del administrador + adminSecret",
      required: true,
    },
  },
  responses: {
    201: {
      description: "Administrador registrado exitosamente",
      content: { "application/json": { schema: z.object({ data: UserProfile }) } },
    },
    400: {
      description: "Error de validación o adminSecret incorrecto",
      content: { "application/json": { schema: ErrorResponse } },
    },
    409: {
      description: "Conflicto — email o teléfono ya registrado",
      content: { "application/json": { schema: ErrorResponse } },
    },
  },
});

// =========================================================================
// AUTH — Login
// =========================================================================

registry.registerPath({
  method: "post",
  path: "/api/auth/login",
  summary: "Iniciar sesión",
  description: [
    "Autentica al usuario con email y contraseña.",
    "Retorna un JWT válido por 8 horas.",
    "Usa el token en las demás rutas con el header:",
    "`Authorization: Bearer <token>`",
  ].join(" "),
  tags: ["Auth"],
  request: {
    body: {
      content: { "application/json": { schema: LoginBody } },
      description: "Credenciales de acceso",
      required: true,
    },
  },
  responses: {
    200: {
      description: "Inicio de sesión exitoso",
      content: { "application/json": { schema: LoginResponse } },
    },
    400: {
      description: "Error de validación (email/password faltantes)",
      content: { "application/json": { schema: ErrorResponse } },
    },
    401: {
      description: "Credenciales inválidas (email no existe o password incorrecto)",
      content: { "application/json": { schema: ErrorResponse } },
    },
    403: {
      description: "Cuenta bloqueada (pendiente, rechazada o suspendida)",
      content: { "application/json": { schema: ErrorResponse } },
    },
  },
});

// =========================================================================
// AUTH — Perfil (protegido)
// =========================================================================

registry.registerPath({
  method: "get",
  path: "/api/auth/me",
  summary: "Obtener perfil del usuario autenticado",
  description: "Devuelve el perfil del usuario correspondiente al token JWT enviado.",
  tags: ["Auth"],
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "Perfil del usuario autenticado",
      content: { "application/json": { schema: z.object({ data: UserProfile }) } },
    },
    401: {
      description: "No autenticado — token faltante, expirado o inválido",
      content: { "application/json": { schema: ErrorResponse } },
    },
    404: {
      description: "Usuario no encontrado",
      content: { "application/json": { schema: ErrorResponse } },
    },
  },
});

// =========================================================================
// HELP REQUESTS
// =========================================================================

registry.registerPath({
  method: "get",
  path: "/api/help-requests",
  summary: "Listar solicitudes de ayuda",
  description: [
    "Lista solicitudes de ayuda con filtros opcionales por geolocalización y estado.",
    "Requiere autenticación y rol admin, organization o volunteer.",
  ].join(" "),
  tags: ["Help Requests"],
  security: [{ bearerAuth: [] }],
  request: {
    query: z.object({
      latitude: z.string().optional().openapi({
        example: "10.4806", description: "Latitud para filtro geoespacial",
      }),
      longitude: z.string().optional().openapi({
        example: "-66.9036", description: "Longitud para filtro geoespacial",
      }),
      radiusKm: z.string().optional().openapi({
        example: "10", description: "Radio en km (default 10, max 100)",
      }),
      status: z.enum(["open", "assigned", "resolved"]).optional().openapi({
        example: "open", description: "Filtrar por estado",
      }),
    }),
  },
  responses: {
    200: { description: "Lista de solicitudes (puede ser vacía)" },
    400: {
      description: "Error de validación en query params",
      content: { "application/json": { schema: ErrorResponse } },
    },
    401: {
      description: "No autenticado",
      content: { "application/json": { schema: ErrorResponse } },
    },
    403: {
      description: "Rol no autorizado",
      content: { "application/json": { schema: ErrorResponse } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/help-requests",
  summary: "Crear solicitud de ayuda",
  description: "Crea una nueva solicitud de ayuda (SOS). Requiere autenticación.",
  tags: ["Help Requests"],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: { "application/json": { schema: HelpRequestCreateBody } },
      description: "Datos de la solicitud",
      required: true,
    },
  },
  responses: {
    201: { description: "Solicitud creada exitosamente" },
    400: {
      description: "Error de validación",
      content: { "application/json": { schema: ErrorResponse } },
    },
    401: {
      description: "No autenticado",
      content: { "application/json": { schema: ErrorResponse } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/help-requests/{id}/accept",
  summary: "Aceptar solicitud de ayuda",
  description: "Un voluntario u organización acepta atender una solicitud. Requiere rol admin/organization.",
  tags: ["Help Requests"],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid().openapi({
        example: "550e8400-e29b-41d4-a716-446655440000",
        description: "UUID de la solicitud",
      }),
    }),
    body: {
      content: { "application/json": { schema: AcceptHelpRequestBody } },
      description: "ID del voluntario (opcional)",
    },
  },
  responses: {
    200: { description: "Solicitud aceptada y asignada" },
    400: {
      description: "ID inválido o error de validación",
      content: { "application/json": { schema: ErrorResponse } },
    },
    401: {
      description: "No autenticado",
      content: { "application/json": { schema: ErrorResponse } },
    },
    403: {
      description: "Rol no autorizado",
      content: { "application/json": { schema: ErrorResponse } },
    },
    404: {
      description: "Solicitud no encontrada",
      content: { "application/json": { schema: ErrorResponse } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/help-requests/{id}/resolve",
  summary: "Resolver solicitud de ayuda",
  description: "Marca una solicitud como resuelta. Requiere rol admin/organization.",
  tags: ["Help Requests"],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid().openapi({
        example: "550e8400-e29b-41d4-a716-446655440000",
        description: "UUID de la solicitud",
      }),
    }),
  },
  responses: {
    200: { description: "Solicitud resuelta exitosamente" },
    400: {
      description: "ID inválido",
      content: { "application/json": { schema: ErrorResponse } },
    },
    401: {
      description: "No autenticado",
      content: { "application/json": { schema: ErrorResponse } },
    },
    403: {
      description: "Rol no autorizado",
      content: { "application/json": { schema: ErrorResponse } },
    },
    404: {
      description: "Solicitud no encontrada",
      content: { "application/json": { schema: ErrorResponse } },
    },
  },
});

// =========================================================================
// EMERGENCIES
// =========================================================================

registry.registerPath({
  method: "get",
  path: "/api/emergencies",
  summary: "Listar emergencias",
  description: "Lista todas las emergencias activas con filtros opcionales. Público.",
  tags: ["Emergencies"],
  request: {
    query: z.object({
      status: z.enum(["received", "assigned", "resolved"]).optional().openapi({
        example: "received", description: "Filtrar por estado",
      }),
      urgency: z.enum(["low", "medium", "high", "critical"]).optional().openapi({
        example: "critical", description: "Filtrar por urgencia",
      }),
    }),
  },
  responses: {
    200: { description: "Lista de emergencias" },
    400: {
      description: "Error de validación en query params",
      content: { "application/json": { schema: ErrorResponse } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/emergencies",
  summary: "Crear emergencia SOS",
  description: "Crea una nueva emergencia SOS accesible. No requiere autenticación.",
  tags: ["Emergencies"],
  request: {
    body: {
      content: { "application/json": { schema: EmergencyCreateBody } },
      description: "Datos de la emergencia",
      required: true,
    },
  },
  responses: {
    201: { description: "Emergencia creada exitosamente" },
    400: {
      description: "Error de validación",
      content: { "application/json": { schema: ErrorResponse } },
    },
  },
});

// =========================================================================
// SYSTEM
// =========================================================================

registry.registerPath({
  method: "get",
  path: "/health",
  summary: "Health check",
  description: "Endpoint de monitoreo para verificar que el servidor está operativo.",
  tags: ["System"],
  responses: {
    200: {
      description: "Servidor operativo",
      content: {
        "application/json": {
          schema: z.object({ status: z.literal("ok") }).openapi({
            example: { status: "ok" },
          }),
        },
      },
    },
  },
});

module.exports = { registry };
