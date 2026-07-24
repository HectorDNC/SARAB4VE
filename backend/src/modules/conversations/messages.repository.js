/**
 * Repositorio — consultas SQL para el dominio de mensajes.
 */
const db = require("../../db");

// ---------------------------------------------------------------------------
// Queries de escritura
// ---------------------------------------------------------------------------

const INSERT_MESSAGE = `
  INSERT INTO messages (conversation_id, sender_user_id, body)
  VALUES ($1, $2, $3)
  RETURNING id,
            conversation_id AS "conversationId",
            sender_user_id AS "senderUserId",
            body,
            created_at AS "createdAt",
            read_at AS "readAt"
`;

/**
 * Inserta un nuevo mensaje.
 * @param {Object} params
 * @param {string} params.conversationId
 * @param {string|null} params.senderUserId — null para ciudadano anónimo
 * @param {string} params.body
 * @returns {Promise<Object>}
 */
async function insertMessage({ conversationId, senderUserId, body }) {
  const result = await db.query(INSERT_MESSAGE, [
    conversationId,
    senderUserId || null,
    body,
  ]);
  return result.rows[0];
}

const UPDATE_MESSAGE_READ_AT = `
  UPDATE messages
  SET read_at = now()
  WHERE id = $1 AND read_at IS NULL
  RETURNING id,
            conversation_id AS "conversationId",
            sender_user_id AS "senderUserId",
            body,
            created_at AS "createdAt",
            read_at AS "readAt"
`;

/**
 * Marca un mensaje como leído.
 * @param {string} messageId
 * @returns {Promise<Object|null>} — null si ya estaba leído o no existe
 */
async function markMessageAsRead(messageId) {
  const result = await db.query(UPDATE_MESSAGE_READ_AT, [messageId]);
  return result.rows[0] || null;
}

// ---------------------------------------------------------------------------
// Queries de lectura
// ---------------------------------------------------------------------------

const LIST_MESSAGES_BY_CONVERSATION = `
  SELECT id,
         conversation_id AS "conversationId",
         sender_user_id AS "senderUserId",
         body,
         created_at AS "createdAt",
         read_at AS "readAt"
  FROM (
    SELECT id, conversation_id, sender_user_id, body, created_at, read_at
    FROM messages
    WHERE conversation_id = $1
    ORDER BY created_at DESC
    LIMIT $2
  ) sub
  ORDER BY created_at ASC
`;

/**
 * Lista mensajes de una conversación (más recientes primero).
 * @param {string} conversationId
 * @param {number} limit
 * @returns {Promise<Array>}
 */
async function listMessagesByConversation(conversationId, limit = 50) {
  const result = await db.query(LIST_MESSAGES_BY_CONVERSATION, [
    conversationId,
    limit,
  ]);
  return result.rows;
}

const LIST_MESSAGES_BY_CONVERSATION_WITH_CURSOR = `
  SELECT id,
         conversation_id AS "conversationId",
         sender_user_id AS "senderUserId",
         body,
         created_at AS "createdAt",
         read_at AS "readAt"
  FROM (
    SELECT id, conversation_id, sender_user_id, body, created_at, read_at
    FROM messages
    WHERE conversation_id = $1 AND created_at < (
      SELECT created_at FROM messages WHERE id = $2
    )
    ORDER BY created_at DESC
    LIMIT $3
  ) sub
  ORDER BY created_at ASC
`;

/**
 * Lista mensajes de una conversación con paginación por cursor.
 * @param {string} conversationId
 * @param {string} cursorMessageId — UUID del mensaje desde el cual paginar
 * @param {number} limit
 * @returns {Promise<Array>}
 */
async function listMessagesByConversationWithCursor(
  conversationId,
  cursorMessageId,
  limit = 50,
) {
  const result = await db.query(LIST_MESSAGES_BY_CONVERSATION_WITH_CURSOR, [
    conversationId,
    cursorMessageId,
    limit,
  ]);
  return result.rows;
}

const FIND_MESSAGE_BY_ID = `
  SELECT id,
         conversation_id AS "conversationId",
         sender_user_id AS "senderUserId",
         body,
         created_at AS "createdAt",
         read_at AS "readAt"
  FROM messages
  WHERE id = $1
`;

/**
 * Busca un mensaje por ID.
 * @param {string} messageId
 * @returns {Promise<Object|null>}
 */
async function findMessageById(messageId) {
  const result = await db.query(FIND_MESSAGE_BY_ID, [messageId]);
  return result.rows[0] || null;
}

module.exports = {
  insertMessage,
  markMessageAsRead,
  listMessagesByConversation,
  listMessagesByConversationWithCursor,
  findMessageById,
};
