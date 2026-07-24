/**
 * Tipos — definiciones JSDoc para el dominio de chat (conversations + messages).
 *
 * @module conversations.types
 */

/**
 * @typedef {"open"|"closed"} ConversationStatus
 */

/**
 * Fila de la tabla `conversations` (keys en camelCase).
 * @typedef {Object} ConversationRow
 * @property {string}            id              — UUID del hilo
 * @property {string|null}       emergencyId     — emergencia asociada (excluyente con helpRequestId)
 * @property {string|null}       helpRequestId   — help_request asociado (excluyente con emergencyId)
 * @property {string}            attendedBy      — UUID del voluntario/organización que atiende
 * @property {ConversationStatus} status         — estado del hilo
 * @property {string}            createdAt       — ISO-8601
 * @property {string}            updatedAt       — ISO-8601
 */

/**
 * Fila de la tabla `messages` (keys en camelCase).
 * @typedef {Object} MessageRow
 * @property {string}      id              — UUID del mensaje
 * @property {string}      conversationId  — UUID del hilo padre
 * @property {string|null} senderUserId    — UUID del remitente (null = ciudadano anónimo)
 * @property {string}      body            — texto del mensaje
 * @property {string}      createdAt       — ISO-8601
 * @property {string|null} readAt          — ISO-8601 o null si aún no leído
 */

/**
 * DTO de entrada para crear un mensaje.
 * @typedef {Object} SendMessageInput
 * @property {string|null} senderUserId — null para ciudadano anónimo
 * @property {string}      body         — texto del mensaje (no vacío)
 */

/**
 * DTO de entrada para getOrCreateOnAttend.
 * @typedef {Object} GetOrCreateConversationInput
 * @property {string}      [emergencyId]  — uno y solo uno
 * @property {string}      [helpRequestId]
 * @property {string}      attendedBy
 */

module.exports = {};
