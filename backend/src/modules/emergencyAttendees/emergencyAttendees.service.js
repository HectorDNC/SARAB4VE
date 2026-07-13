/**
 * Servicio — lógica de negocio para emergency-attendees.
 */

/**
 * Vincula al usuario autenticado como atendiendo una emergencia.
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
