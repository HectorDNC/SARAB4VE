/**
 * Servicio — lógica de negocio para help-request-attendees.
 */

const helpRequestsRepository = require("../helpRequests/helpRequests.repository");
const conversationsService = require("../conversations/conversations.service");
const conversationsRepository = require("../conversations/conversations.repository");

/**
 * Vincula al usuario autenticado como atendiendo un help request.
 * Si el help request está en estado "open", lo transiciona a "assigned".
 * Crea automáticamente una conversación para el chat.
 * @param {string} helpRequestId
 * @param {string} attendedBy — userId del token JWT
 * @param {Object} repository
 * @returns {Promise<{ data: Object|null, status: number, errors?: string[] }>}
 */
async function createHelpRequestAttendee(helpRequestId, attendedBy, repository) {
  const row = await repository.insertHelpRequestAttendee(helpRequestId, attendedBy);

  if (!row) {
    return { errors: ["attendee already exists for this help request"], status: 409 };
  }

  // Transicionar el help request de "open" → "assigned"
  await helpRequestsRepository.updateHelpRequestStatusToAssigned(helpRequestId, attendedBy);

  // Crear conversación para el chat (idempotente)
  try {
    await conversationsService.getOrCreateOnAttend(
      { helpRequestId, attendedBy },
      conversationsRepository,
    );
  } catch (error) {
    console.error("[helpRequestAttendees] Error creando conversación:", error.message);
    // No fallar si la conversación no se puede crear, continuar con el flujo normal
  }

  return { data: row, status: 201 };
}

/**
 * Lista los usuarios que atienden un help request.
 * @param {string} helpRequestId
 * @param {Object} repository
 * @returns {Promise<{ data: Array, status: number }>}
 */
async function listHelpRequestAttendees(helpRequestId, repository) {
  const rows = await repository.findAttendeesByHelpRequestId(helpRequestId);
  return { data: rows, status: 200 };
}

module.exports = {
  createHelpRequestAttendee,
  listHelpRequestAttendees,
};
