/**
 * Repositorio — consultas SQL para help-request-attendees.
 */
const db = require("../../db");

// ---------------------------------------------------------------------------
// Queries de escritura
// ---------------------------------------------------------------------------

const INSERT_HELP_REQUEST_ATTENDEE = `
  INSERT INTO help_request_attendees (help_request_id, attended_by)
  VALUES ($1, $2)
  ON CONFLICT (help_request_id, attended_by) DO NOTHING
  RETURNING id,
            help_request_id AS "helpRequestId",
            attended_by AS "attendedBy",
            attended_at AS "attendedAt"
`;

/**
 * @param {string} helpRequestId
 * @param {string} attendedBy
 * @returns {Promise<Object|null>}
 */
async function insertHelpRequestAttendee(helpRequestId, attendedBy) {
  const result = await db.query(INSERT_HELP_REQUEST_ATTENDEE, [helpRequestId, attendedBy]);
  return result.rows[0] || null;
}

// ---------------------------------------------------------------------------
// Queries de lectura
// ---------------------------------------------------------------------------

const FIND_ATTENDEES_BY_HELP_REQUEST_ID = `
  SELECT hra.id,
         hra.help_request_id AS "helpRequestId",
         hra.attended_by AS "attendedBy",
         hra.attended_at AS "attendedAt",
         u.full_name AS "userName",
         u.email AS "userEmail",
         u.role AS "userRole"
  FROM help_request_attendees hra
  JOIN users u ON u.id = hra.attended_by
  WHERE hra.help_request_id = $1
  ORDER BY hra.attended_at ASC
`;

/**
 * @param {string} helpRequestId
 * @returns {Promise<Array>}
 */
async function findAttendeesByHelpRequestId(helpRequestId) {
  const result = await db.query(FIND_ATTENDEES_BY_HELP_REQUEST_ID, [helpRequestId]);
  return result.rows;
}

module.exports = {
  insertHelpRequestAttendee,
  findAttendeesByHelpRequestId,
};
