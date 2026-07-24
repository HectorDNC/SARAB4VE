/**
 * Servicio — lógica de negocio para emergency-attendees.
 */

const emergenciesRepository = require("../emergencies/emergencies.repository");
const conversationsService = require("../conversations/conversations.service");
const conversationsRepository = require("../conversations/conversations.repository");

/**
 * Vincula al usuario autenticado como atendiendo una emergencia.
 * Si la emergencia está en estado "received", la transiciona a "assigned".
 * Crea automáticamente una conversación para el chat.
 * @param {string} emergencyId
 * @param {string} attendedBy — userId del token JWT
 * @param {Object} repository
 * @returns {Promise<{ data: Object|null, status: number, errors?: string[] }>}
 */
async function createEmergencyAttendee(emergencyId, attendedBy, repository) {
  const row = await repository.insertEmergencyAttendee(emergencyId, attendedBy);

  if (!row) {
    return { errors: ["attendee already exists for this emergency"], status: 409 };
  }

  // Transicionar la emergencia de "received" → "assigned"
  await emergenciesRepository.updateEmergencyStatusToAssigned(emergencyId);

  // Crear conversación para el chat (idempotente)
  try {
    await conversationsService.getOrCreateOnAttend(
      { emergencyId, attendedBy },
      conversationsRepository,
    );
  } catch (error) {
    console.error("[emergencyAttendees] Error creando conversación:", error.message);
    // No fallar si la conversación no se puede crear, continuar con el flujo normal
  }

  return { data: row, status: 201 };
}

/**
 * Lista los usuarios que atienden una emergencia.
 * @param {string} emergencyId
 * @param {Object} repository
 * @returns {Promise<{ data: Array, status: number }>}
 */
async function listEmergencyAttendees(emergencyId, repository) {
  const rows = await repository.findAttendeesByEmergencyId(emergencyId);
  return { data: rows, status: 200 };
}

module.exports = {
  createEmergencyAttendee,
  listEmergencyAttendees,
};
