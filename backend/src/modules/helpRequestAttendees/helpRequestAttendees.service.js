/**
 * Servicio — lógica de negocio para help-request-attendees.
 */

const helpRequestsRepository = require("../helpRequests/helpRequests.repository");

/**
 * Vincula al usuario autenticado como atendiendo un help request.
 * Si el help request está en estado "open", lo transiciona a "assigned".
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
