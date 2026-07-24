/**
 * Servicio — lógica de negocio para conversaciones.
 */

/**
 * Crea o recupera una conversación cuando un usuario atiende una emergencia/help_request.
 * Idempotente: si ya existe, la retorna sin error.
 * @param {Object} params
 * @param {string} [params.emergencyId] — uno y solo uno
 * @param {string} [params.helpRequestId]
 * @param {string} params.attendedBy — UUID del voluntario/organización
 * @param {Object} conversationsRepository
 * @returns {Promise<Object>} — la conversación creada o existente
 */
async function getOrCreateOnAttend(
  { emergencyId, helpRequestId, attendedBy },
  conversationsRepository,
) {
  // Validación: exactamente uno debe estar presente
  if ((emergencyId && helpRequestId) || (!emergencyId && !helpRequestId)) {
    throw new Error(
      "Debe proporcionar exactamente uno: emergencyId o helpRequestId",
    );
  }

  // Intentar encontrar conversación existente
  let existing = null;
  if (emergencyId) {
    existing = await conversationsRepository.findConversationByEmergencyAndAttendee(
      emergencyId,
      attendedBy,
    );
  } else {
    existing = await conversationsRepository.findConversationByHelpRequestAndAttendee(
      helpRequestId,
      attendedBy,
    );
  }

  if (existing) {
    return existing;
  }

  // Crear nueva conversación
  try {
    const conversation = await conversationsRepository.insertConversation({
      emergencyId: emergencyId || null,
      helpRequestId: helpRequestId || null,
      attendedBy,
    });
    return conversation;
  } catch (error) {
    // Capturar violación de unique constraint (23505 = PostgreSQL unique violation)
    if (error.code === "23505") {
      // Ya existe, recuperarla
      if (emergencyId) {
        return conversationsRepository.findConversationByEmergencyAndAttendee(
          emergencyId,
          attendedBy,
        );
      } else {
        return conversationsRepository.findConversationByHelpRequestAndAttendee(
          helpRequestId,
          attendedBy,
        );
      }
    }
    throw error;
  }
}

/**
 * Lista conversaciones donde el usuario participa.
 * @param {string} userId — UUID del usuario autenticado
 * @param {Object} conversationsRepository
 * @returns {Promise<Array>}
 */
async function listForUser(userId, conversationsRepository) {
  return conversationsRepository.listConversationsForUser(userId);
}

/**
 * Recupera conversaciones de una emergencia usando el token de acceso del ciudadano.
 * @param {string} emergencyId — UUID de la emergencia
 * @param {string} accessToken — token plano (se compara con el hash en DB)
 * @param {Object} emergenciesRepository — repositorio de emergencias
 * @param {Object} conversationsRepository
 * @returns {Promise<Array>}
 */
async function getByAccessToken(
  emergencyId,
  accessToken,
  emergenciesRepository,
  conversationsRepository,
) {
  const bcrypt = require("bcrypt");

  // Buscar emergencia y su access_token_hash
  const emergency = await emergenciesRepository.findEmergencyById(emergencyId);
  if (!emergency) {
    throw new Error("Emergencia no encontrada");
  }

  if (!emergency.accessTokenHash) {
    throw new Error("Esta emergencia no tiene token de acceso configurado");
  }

  // Validar token
  const isValid = await bcrypt.compare(accessToken, emergency.accessTokenHash);
  if (!isValid) {
    throw new Error("Token de acceso inválido");
  }

  // Retornar conversaciones de esta emergencia
  return conversationsRepository.listConversationsByEmergency(emergencyId);
}

module.exports = {
  getOrCreateOnAttend,
  listForUser,
  getByAccessToken,
};
