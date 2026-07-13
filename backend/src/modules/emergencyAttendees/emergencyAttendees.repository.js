/**
 * Repositorio — consultas SQL para emergency-attendees.
 */
const db = require("../../db");

// ---------------------------------------------------------------------------
// Queries de escritura
// ---------------------------------------------------------------------------

const INSERT_EMERGENCY_ATTENDEE = `
  INSERT INTO emergency_attendees (emergency_id, attended_by)
  VALUES ($1, $2)
  ON CONFLICT (emergency_id, attended_by) DO NOTHING
  RETURNING id,
            emergency_id AS "emergencyId",
            attended_by AS "attendedBy",
            attended_at AS "attendedAt"
`;

/**
 * @param {string} emergencyId
 * @param {string} attendedBy
 * @returns {Promise<Object|null>}
 */
async function insertEmergencyAttendee(emergencyId, attendedBy) {
  const result = await db.query(INSERT_EMERGENCY_ATTENDEE, [emergencyId, attendedBy]);
  return result.rows[0] || null;
}

// ---------------------------------------------------------------------------
// Queries de lectura
// ---------------------------------------------------------------------------

const FIND_ATTENDEES_BY_EMERGENCY_ID = `
  SELECT ea.id,
         ea.emergency_id AS "emergencyId",
         ea.attended_by AS "attendedBy",
         ea.attended_at AS "attendedAt",
         u.full_name AS "userName",
         u.email AS "userEmail",
         u.role AS "userRole"
  FROM emergency_attendees ea
  JOIN users u ON u.id = ea.attended_by
  WHERE ea.emergency_id = $1
  ORDER BY ea.attended_at ASC
`;

/**
 * @param {string} emergencyId
 * @returns {Promise<Array>}
 */
async function findAttendeesByEmergencyId(emergencyId) {
  const result = await db.query(FIND_ATTENDEES_BY_EMERGENCY_ID, [emergencyId]);
  return result.rows;
}

module.exports = {
  insertEmergencyAttendee,
  findAttendeesByEmergencyId,
};
