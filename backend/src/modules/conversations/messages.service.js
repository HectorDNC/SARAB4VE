/**
 * Servicio — lógica de negocio para mensajes.
 */

/**
 * Envía un mensaje a una conversación.
 * @param {Object} params
 * @param {string} params.conversationId — UUID de la conversación
 * @param {string|null} params.senderUserId — UUID del remitente (null = ciudadano anónimo)
 * @param {string} params.body — texto del mensaje
 * @param {Object} conversationsRepository
 * @param {Object} messagesRepository
 * @param {Object} [websocketService] — servicio WebSocket opcional para notificaciones
 * @returns {Promise<Object>} — el mensaje creado
 */
async function sendMessage(
  { conversationId, senderUserId, body },
  conversationsRepository,
  messagesRepository,
  websocketService = null,
) {
  // Validar que la conversación existe y está abierta
  const conversation = await conversationsRepository.findConversationById(conversationId);
  if (!conversation) {
    throw new Error("Conversación no encontrada");
  }

  if (conversation.status !== "open") {
    throw new Error("No se puede enviar mensajes a una conversación cerrada");
  }

  // Insertar mensaje
  const message = await messagesRepository.insertMessage({
    conversationId,
    senderUserId,
    body,
  });

  // Notificar por WebSocket si está disponible
  if (websocketService && websocketService.notifyNewMessage) {
    websocketService.notifyNewMessage(conversationId, message);
  }

  return message;
}

/**
 * Lista mensajes de una conversación con paginación por cursor.
 * @param {string} conversationId — UUID de la conversación
 * @param {string|null} cursor — UUID del mensaje desde el cual paginar (null = desde el más reciente)
 * @param {number} limit — cantidad máxima de mensajes
 * @param {Object} conversationsRepository
 * @param {Object} messagesRepository
 * @returns {Promise<Array>}
 */
async function listByConversation(
  conversationId,
  cursor,
  limit,
  conversationsRepository,
  messagesRepository,
) {
  // Validar que la conversación existe
  const conversation = await conversationsRepository.findConversationById(conversationId);
  if (!conversation) {
    throw new Error("Conversación no encontrada");
  }

  // Listar mensajes
  if (cursor) {
    return messagesRepository.listMessagesByConversationWithCursor(
      conversationId,
      cursor,
      limit,
    );
  } else {
    return messagesRepository.listMessagesByConversation(conversationId, limit);
  }
}

/**
 * Marca un mensaje como leído.
 * @param {string} messageId — UUID del mensaje
 * @param {Object} messagesRepository
 * @param {Object} [websocketService] — servicio WebSocket opcional para notificaciones
 * @returns {Promise<Object>} — el mensaje actualizado
 */
async function markAsRead(messageId, messagesRepository, websocketService = null) {
  const message = await messagesRepository.markMessageAsRead(messageId);
  if (!message) {
    throw new Error("Mensaje no encontrado o ya marcado como leído");
  }

  // Notificar por WebSocket si está disponible
  if (websocketService && websocketService.notifyMessageRead) {
    websocketService.notifyMessageRead(message.conversationId, message);
  }

  return message;
}

module.exports = {
  sendMessage,
  listByConversation,
  markAsRead,
};
