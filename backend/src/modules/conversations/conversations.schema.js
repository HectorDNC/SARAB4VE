/**
 * Schemas Zod — validación y documentación OpenAPI para el dominio de chat.
 *
 * Cada DTO se define una sola vez como schema Zod. El mismo schema:
 *   1. Valida el request body/params/query en el controller (safeParse)
 *   2. Genera la documentación OpenAPI automáticamente (.openapi())
 */

const { z } = require("zod");
const { extendZodWithOpenApi } = require("@asteasolutions/zod-to-openapi");

extendZodWithOpenApi(z);

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CONVERSATION_STATUSES = ["open", "closed"];
const CONVERSATION_STATUS_SET = new Set(CONVERSATION_STATUSES);

// ---------------------------------------------------------------------------
// Schemas reutilizables
// ---------------------------------------------------------------------------

/**
 * Respuesta de una conversación (lista o detalle).
 */
const ConversationResponse = z.object({
  id: z.string().uuid().openapi({
    example: "550e8400-e29b-41d4-a716-446655440000",
    description: "UUID del hilo de conversación",
  }),
  emergencyId: z.string().uuid().nullable().openapi({
    example: "550e8400-e29b-41d4-a716-446655440001",
    description: "UUID de la emergencia (null si es help_request)",
  }),
  helpRequestId: z.string().uuid().nullable().openapi({
    example: "550e8400-e29b-41d4-a716-446655440002",
    description: "UUID del help_request (null si es emergencia)",
  }),
  attendedBy: z.string().uuid().openapi({
    example: "550e8400-e29b-41d4-a716-446655440003",
    description: "UUID del voluntario/organización que atiende",
  }),
  status: z.enum(CONVERSATION_STATUSES).openapi({
    example: "open",
    description: "Estado del hilo",
  }),
  createdAt: z.string().datetime().openapi({
    example: "2026-07-24T10:00:00.000Z",
    description: "Fecha de creación",
  }),
  updatedAt: z.string().datetime().openapi({
    example: "2026-07-24T10:00:00.000Z",
    description: "Última actualización",
  }),
}).openapi({ description: "Hilo de conversación" });

/**
 * Respuesta de un mensaje individual.
 */
const MessageResponse = z.object({
  id: z.string().uuid().openapi({
    example: "550e8400-e29b-41d4-a716-446655440010",
    description: "UUID del mensaje",
  }),
  conversationId: z.string().uuid().openapi({
    example: "550e8400-e29b-41d4-a716-446655440000",
    description: "UUID del hilo padre",
  }),
  senderUserId: z.string().uuid().nullable().openapi({
    example: "550e8400-e29b-41d4-a716-446655440003",
    description: "UUID del remitente (null = ciudadano anónimo)",
  }),
  body: z.string().min(1).openapi({
    example: "Hola, ya voy en camino",
    description: "Texto del mensaje",
  }),
  createdAt: z.string().datetime().openapi({
    example: "2026-07-24T10:05:00.000Z",
    description: "Fecha de creación",
  }),
  readAt: z.string().datetime().nullable().openapi({
    example: "2026-07-24T10:06:00.000Z",
    description: "Fecha de lectura (null si no leído)",
  }),
}).openapi({ description: "Mensaje individual" });

// ---------------------------------------------------------------------------
// POST /api/conversations/:id/messages — body
// ---------------------------------------------------------------------------

const SendMessageBody = z.object({
  body: z.string()
    .min(1, "body es requerido")
    .max(5000, "body no puede exceder 5000 caracteres")
    .trim()
    .openapi({
      example: "Hola, ya voy en camino",
      description: "Texto del mensaje",
    }),
}).openapi({ description: "Payload para enviar un mensaje" });

// ---------------------------------------------------------------------------
// PATCH /api/messages/:id/read — params
// ---------------------------------------------------------------------------

const MarkReadParams = z.object({
  id: z.string().uuid().openapi({
    example: "550e8400-e29b-41d4-a716-446655440010",
    description: "UUID del mensaje a marcar como leído",
  }),
}).openapi({ description: "Parámetros para marcar mensaje como leído" });

// ---------------------------------------------------------------------------
// GET /api/conversations/:id/messages — params + query
// ---------------------------------------------------------------------------

const ConversationMessagesParams = z.object({
  id: z.string().uuid().openapi({
    example: "550e8400-e29b-41d4-a716-446655440000",
    description: "UUID de la conversación",
  }),
}).openapi({ description: "Parámetros para listar mensajes" });

const ConversationMessagesQuery = z.object({
  cursor: z.string().uuid().optional().openapi({
    example: "550e8400-e29b-41d4-a716-446655440010",
    description: "UUID del mensaje desde el cual paginar (exclusivo)",
  }),
  limit: z.coerce.number()
    .int()
    .min(1)
    .max(100)
    .default(50)
    .openapi({
      example: 50,
      description: "Cantidad máxima de mensajes a retornar (1-100, default 50)",
    }),
}).openapi({ description: "Query params para paginación de mensajes" });

// ---------------------------------------------------------------------------
// POST /api/conversations/:id/messages — params
// ---------------------------------------------------------------------------

const SendMessageParams = z.object({
  id: z.string().uuid().openapi({
    example: "550e8400-e29b-41d4-a716-446655440000",
    description: "UUID de la conversación destino",
  }),
}).openapi({ description: "Parámetros para enviar mensaje" });

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

/**
 * Valida el body de POST /api/conversations/:id/messages
 * @param {unknown} body
 * @returns {{ isValid: boolean, errors: string[], data?: z.infer<typeof SendMessageBody> }}
 */
function validateSendMessage(body) {
  const result = SendMessageBody.safeParse(body);
  if (!result.success) {
    return {
      isValid: false,
      errors: result.error.issues.map((i) => i.message),
    };
  }
  return { isValid: true, errors: [], data: result.data };
}

/**
 * Valida params de GET /api/conversations/:id/messages
 * @param {unknown} params
 * @returns {{ isValid: boolean, errors: string[], data?: z.infer<typeof ConversationMessagesParams> }}
 */
function validateConversationMessagesParams(params) {
  const result = ConversationMessagesParams.safeParse(params);
  if (!result.success) {
    return {
      isValid: false,
      errors: result.error.issues.map((i) => i.message),
    };
  }
  return { isValid: true, errors: [], data: result.data };
}

/**
 * Valida query de GET /api/conversations/:id/messages
 * @param {unknown} query
 * @returns {{ isValid: boolean, errors: string[], data?: z.infer<typeof ConversationMessagesQuery> }}
 */
function validateConversationMessagesQuery(query) {
  const result = ConversationMessagesQuery.safeParse(query);
  if (!result.success) {
    return {
      isValid: false,
      errors: result.error.issues.map((i) => i.message),
    };
  }
  return { isValid: true, errors: [], data: result.data };
}

/**
 * Valida params de PATCH /api/messages/:id/read
 * @param {unknown} params
 * @returns {{ isValid: boolean, errors: string[], data?: z.infer<typeof MarkReadParams> }}
 */
function validateMarkReadParams(params) {
  const result = MarkReadParams.safeParse(params);
  if (!result.success) {
    return {
      isValid: false,
      errors: result.error.issues.map((i) => i.message),
    };
  }
  return { isValid: true, errors: [], data: result.data };
}

/**
 * Valida params de POST /api/conversations/:id/messages
 * @param {unknown} params
 * @returns {{ isValid: boolean, errors: string[], data?: z.infer<typeof SendMessageParams> }}
 */
function validateSendMessageParams(params) {
  const result = SendMessageParams.safeParse(params);
  if (!result.success) {
    return {
      isValid: false,
      errors: result.error.issues.map((i) => i.message),
    };
  }
  return { isValid: true, errors: [], data: result.data };
}

module.exports = {
  CONVERSATION_STATUSES,
  CONVERSATION_STATUS_SET,
  ConversationResponse,
  MessageResponse,
  SendMessageBody,
  SendMessageParams,
  MarkReadParams,
  ConversationMessagesParams,
  ConversationMessagesQuery,
  validateSendMessage,
  validateConversationMessagesParams,
  validateConversationMessagesQuery,
  validateMarkReadParams,
  validateSendMessageParams,
};
