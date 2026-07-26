/**
 * Controlador — handlers HTTP para el dominio de chat (conversations + messages).
 */

/**
 * GET /api/conversations — lista hilos del usuario autenticado (JWT)
 */
function listForUser(conversationsService, conversationsRepository) {
  return async (req, res, next) => {
    try {
      const conversations = await conversationsService.listForUser(
        req.user.userId,
        conversationsRepository,
      );
      return res.json({ data: conversations });
    } catch (error) {
      return next(error);
    }
  };
}

/**
 * GET /api/conversations/mine — lista hilos del ciudadano anónimo (token)
 */
function listForCitizen(conversationsRepository) {
  return async (req, res, next) => {
    try {
      const conversations = await conversationsRepository.listConversationsByEmergency(
        req.citizenEmergencyId,
      );
      return res.json({ data: conversations });
    } catch (error) {
      return next(error);
    }
  };
}

/**
 * GET /api/conversations/:id/messages — lista mensajes de una conversación (JWT o token)
 */
function listMessages(
  messagesService,
  conversationsRepository,
  messagesRepository,
  schema,
) {
  return async (req, res, next) => {
    const paramsValidation = schema.validateConversationMessagesParams(req.params);
    if (!paramsValidation.isValid) {
      return res.status(400).json({ errors: paramsValidation.errors });
    }

    const queryValidation = schema.validateConversationMessagesQuery(req.query);
    if (!queryValidation.isValid) {
      return res.status(400).json({ errors: queryValidation.errors });
    }

    try {
      const conversationId = paramsValidation.data.id;
      const { cursor, limit } = queryValidation.data;

      // Validar pertenencia: JWT o token de ciudadano
      const hasAccess = await validateConversationAccess(
        conversationId,
        req.user,
        req.citizenEmergencyId,
        conversationsRepository,
      );

      if (!hasAccess) {
        return res.status(403).json({
          errors: ["No tienes acceso a esta conversación"],
        });
      }

      const messages = await messagesService.listByConversation(
        conversationId,
        cursor || null,
        limit,
        conversationsRepository,
        messagesRepository,
      );

      return res.json({ data: messages });
    } catch (error) {
      return next(error);
    }
  };
}

/**
 * POST /api/conversations/:id/messages — envía un mensaje (JWT o token)
 */
function sendMessage(
  messagesService,
  conversationsRepository,
  messagesRepository,
  schema,
  websocketService = null,
) {
  return async (req, res, next) => {
    const paramsValidation = schema.validateSendMessageParams(req.params);
    if (!paramsValidation.isValid) {
      return res.status(400).json({ errors: paramsValidation.errors });
    }

    const bodyValidation = schema.validateSendMessage(req.body);
    if (!bodyValidation.isValid) {
      return res.status(400).json({ errors: bodyValidation.errors });
    }

    try {
      const conversationId = paramsValidation.data.id;
      const { body } = bodyValidation.data;

      // Determinar senderUserId: JWT user o null (ciudadano anónimo)
      const senderUserId = req.user ? req.user.userId : null;

      // Validar pertenencia
      const hasAccess = await validateConversationAccess(
        conversationId,
        req.user,
        req.citizenEmergencyId,
        conversationsRepository,
      );

      if (!hasAccess) {
        return res.status(403).json({
          errors: ["No tienes acceso a esta conversación"],
        });
      }

      const message = await messagesService.sendMessage(
        { conversationId, senderUserId, body },
        conversationsRepository,
        messagesRepository,
        websocketService,
      );

      return res.status(201).json({ data: message });
    } catch (error) {
      // Errores de negocio (conversación cerrada, no encontrada)
      if (
        error.message === "Conversación no encontrada" ||
        error.message === "No se puede enviar mensajes a una conversación cerrada"
      ) {
        return res.status(400).json({ errors: [error.message] });
      }
      return next(error);
    }
  };
}

/**
 * PATCH /api/messages/:id/read — marca un mensaje como leído (JWT o token)
 */
function markMessageRead(messagesService, messagesRepository, schema) {
  return async (req, res, next) => {
    const paramsValidation = schema.validateMarkReadParams(req.params);
    if (!paramsValidation.isValid) {
      return res.status(400).json({ errors: paramsValidation.errors });
    }

    try {
      const messageId = paramsValidation.data.id;
      const message = await messagesService.markAsRead(
        messageId,
        messagesRepository,
      );
      return res.json({ data: message });
    } catch (error) {
      if (error.message === "Mensaje no encontrado o ya marcado como leído") {
        return res.status(404).json({ errors: [error.message] });
      }
      return next(error);
    }
  };
}

/**
 * Helper: valida si el usuario (JWT) o ciudadano (token) tiene acceso a la conversación.
 * @param {string} conversationId
 * @param {Object|null} user — req.user (null si es ciudadano anónimo)
 * @param {string|null} citizenEmergencyId — req.citizenEmergencyId (null si es JWT)
 * @param {Object} conversationsRepository
 * @returns {Promise<boolean>}
 */
async function validateConversationAccess(
  conversationId,
  user,
  citizenEmergencyId,
  conversationsRepository,
) {
  const conversation = await conversationsRepository.findConversationById(conversationId);
  if (!conversation) {
    return false;
  }

  // Si es ciudadano anónimo, validar que la conversación pertenezca a su emergencia
  if (citizenEmergencyId) {
    return conversation.emergencyId === citizenEmergencyId;
  }

  // Si es usuario JWT, validar que sea attended_by o que atienda la emergencia/help_request
  if (user) {
    // Es el attended_by de la conversación
    if (conversation.attendedBy === user.userId) {
      return true;
    }

    // TODO: validar si atiende la emergencia/help_request asociado
    // Por ahora, permitimos acceso si es attended_by
    // En producción, necesitaríamos consultar emergency_attendees/help_request_attendees
    return false;
  }

  return false;
}

module.exports = {
  listForUser,
  listForCitizen,
  listMessages,
  sendMessage,
  markMessageRead,
};
