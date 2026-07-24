/**
 * Repositorio — consultas SQL para el dominio de conversaciones.
 */
const db = require("../../db");

// ---------------------------------------------------------------------------
// Queries de escritura
// ---------------------------------------------------------------------------

const INSERT_CONVERSATION = `
  INSERT INTO conversations (emergency_id, help_request_id, attended_by)
  VALUES ($1, $2, $3)
  RETURNING id,
            emergency_id AS "emergencyId",
            help_request_id AS "helpRequestId",
            attended_by AS "attendedBy",
            status,
            created_at AS "createdAt",
            updated_at AS "updatedAt"
`;

/**
 * Inserta una nueva conversación.
 * @param {Object} params
 * @param {string|null} params.emergencyId
 * @param {string|null} params.helpRequestId
 * @param {string} params.attendedBy
 * @returns {Promise<Object>}
 */
async function insertConversation({ emergencyId, helpRequestId, attendedBy }) {
  const result = await db.query(INSERT_CONVERSATION, [
    emergencyId || null,
    helpRequestId || null,
    attendedBy,
  ]);
  return result.rows[0];
}

// ---------------------------------------------------------------------------
// Queries de lectura
// ---------------------------------------------------------------------------

const FIND_CONVERSATION_BY_ID = `
  SELECT id,
         emergency_id AS "emergencyId",
         help_request_id AS "helpRequestId",
         attended_by AS "attendedBy",
         status,
         created_at AS "createdAt",
         updated_at AS "updatedAt"
  FROM conversations
  WHERE id = $1
`;

/**
 * Busca una conversación por ID.
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
async function findConversationById(id) {
  const result = await db.query(FIND_CONVERSATION_BY_ID, [id]);
  return result.rows[0] || null;
}

const FIND_CONVERSATION_BY_EMERGENCY_AND_ATTENDEE = `
  SELECT id,
         emergency_id AS "emergencyId",
         help_request_id AS "helpRequestId",
         attended_by AS "attendedBy",
         status,
         created_at AS "createdAt",
         updated_at AS "updatedAt"
  FROM conversations
  WHERE emergency_id = $1 AND attended_by = $2
`;

/**
 * Busca una conversación por emergencia + attended_by.
 * @param {string} emergencyId
 * @param {string} attendedBy
 * @returns {Promise<Object|null>}
 */
async function findConversationByEmergencyAndAttendee(emergencyId, attendedBy) {
  const result = await db.query(FIND_CONVERSATION_BY_EMERGENCY_AND_ATTENDEE, [
    emergencyId,
    attendedBy,
  ]);
  return result.rows[0] || null;
}

const FIND_CONVERSATION_BY_HELP_REQUEST_AND_ATTENDEE = `
  SELECT id,
         emergency_id AS "emergencyId",
         help_request_id AS "helpRequestId",
         attended_by AS "attendedBy",
         status,
         created_at AS "createdAt",
         updated_at AS "updatedAt"
  FROM conversations
  WHERE help_request_id = $1 AND attended_by = $2
`;

/**
 * Busca una conversación por help_request + attended_by.
 * @param {string} helpRequestId
 * @param {string} attendedBy
 * @returns {Promise<Object|null>}
 */
async function findConversationByHelpRequestAndAttendee(helpRequestId, attendedBy) {
  const result = await db.query(FIND_CONVERSATION_BY_HELP_REQUEST_AND_ATTENDEE, [
    helpRequestId,
    attendedBy,
  ]);
  return result.rows[0] || null;
}

const LIST_CONVERSATIONS_FOR_USER = `
  SELECT DISTINCT c.id,
         c.emergency_id AS "emergencyId",
         c.help_request_id AS "helpRequestId",
         c.attended_by AS "attendedBy",
         c.status,
         c.created_at AS "createdAt",
         c.updated_at AS "updatedAt"
  FROM conversations c
  LEFT JOIN emergencies e ON c.emergency_id = e.id
  LEFT JOIN help_requests hr ON c.help_request_id = hr.id
  WHERE c.attended_by = $1
     OR e.id IN (
       SELECT ea.emergency_id
       FROM emergency_attendees ea
       WHERE ea.attended_by = $1
     )
     OR hr.id IN (
       SELECT hra.help_request_id
       FROM help_request_attendees hra
       WHERE hra.attended_by = $1
     )
  ORDER BY c.updated_at DESC
`;

/**
 * Lista conversaciones donde el usuario es attended_by o atiende la emergencia/help_request.
 * @param {string} userId
 * @returns {Promise<Array>}
 */
async function listConversationsForUser(userId) {
  const result = await db.query(LIST_CONVERSATIONS_FOR_USER, [userId]);
  return result.rows;
}

const LIST_CONVERSATIONS_BY_EMERGENCY = `
  SELECT id,
         emergency_id AS "emergencyId",
         help_request_id AS "helpRequestId",
         attended_by AS "attendedBy",
         status,
         created_at AS "createdAt",
         updated_at AS "updatedAt"
  FROM conversations
  WHERE emergency_id = $1
  ORDER BY created_at ASC
`;

/**
 * Lista conversaciones de una emergencia (para el ciudadano anónimo).
 * @param {string} emergencyId
 * @returns {Promise<Array>}
 */
async function listConversationsByEmergency(emergencyId) {
  const result = await db.query(LIST_CONVERSATIONS_BY_EMERGENCY, [emergencyId]);
  return result.rows;
}

module.exports = {
  insertConversation,
  findConversationById,
  findConversationByEmergencyAndAttendee,
  findConversationByHelpRequestAndAttendee,
  listConversationsForUser,
  listConversationsByEmergency,
};
