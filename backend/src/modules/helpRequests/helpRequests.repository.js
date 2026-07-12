/**
 * Repositorio — consultas SQL para el dominio de help-requests.
 */
const db = require("../../db");

// ---------------------------------------------------------------------------
// Helper geo
// ---------------------------------------------------------------------------

/**
 * @param {number} latitudeIndex
 * @param {number} longitudeIndex
 * @returns {string}
 */
function buildDistanceExpression(latitudeIndex, longitudeIndex) {
  return `
    6371 * acos(
      least(
        1,
        greatest(
          -1,
          cos(radians($${latitudeIndex})) * cos(radians(latitude)) *
          cos(radians(longitude) - radians($${longitudeIndex})) +
          sin(radians($${latitudeIndex})) * sin(radians(latitude))
        )
      )
    )
  `;
}

// ---------------------------------------------------------------------------
// Queries de lectura
// ---------------------------------------------------------------------------

/**
 * @param {Object} filters — salida de validateSearchHelpRequests().filters
 * @returns {{ sql: string, values: Array }}
 */
function buildListHelpRequestsQuery(filters) {
  const values = [];
  const baseConditions = [];

  if (filters.status) {
    values.push(filters.status);
    baseConditions.push(`status = $${values.length}`);
  }

  if (!filters.hasGeoFilter) {
    let sql = `
      SELECT id,
             requester_name AS "requesterName",
             contact_method AS "contactMethod",
             contact_value AS "contactValue",
             need_type AS "needType",
             description,
             latitude, longitude, urgency, status,
             assigned_at AS "assignedAt",
             resolved_at AS "resolvedAt",
             created_at AS "createdAt"
      FROM help_requests
    `;

    if (baseConditions.length > 0) {
      sql += ` WHERE ${baseConditions.join(" AND ")}`;
    }

    sql += " ORDER BY \"createdAt\" DESC LIMIT 100";

    return { sql, values };
  }

  values.push(filters.latitude);
  const latitudeIndex = values.length;
  values.push(filters.longitude);
  const longitudeIndex = values.length;
  values.push(filters.radiusKm);
  const radiusIndex = values.length;

  // Excluir filas sin coordenadas — no se puede calcular distancia sin ellas
  baseConditions.push("latitude IS NOT NULL AND longitude IS NOT NULL");

  const distanceExpression = buildDistanceExpression(latitudeIndex, longitudeIndex);
  const whereClause = baseConditions.length > 0 ? `WHERE ${baseConditions.join(" AND ")}` : "";

  const sql = `
    WITH scoped_help_requests AS (
      SELECT id,
             requester_name AS "requesterName",
             contact_method AS "contactMethod",
             contact_value AS "contactValue",
             need_type AS "needType",
             description,
             latitude, longitude, urgency, status,
             assigned_at AS "assignedAt",
             resolved_at AS "resolvedAt",
             created_at AS "createdAt",
             ROUND((${distanceExpression})::numeric, 3) AS "distanceKm"
      FROM help_requests
      ${whereClause}
    )
    SELECT *
    FROM scoped_help_requests
    WHERE "distanceKm" <= $${radiusIndex}
    ORDER BY "distanceKm" ASC, "createdAt" DESC
    LIMIT 100
  `;

  return { sql, values };
}

// ---------------------------------------------------------------------------
// Queries de escritura
// ---------------------------------------------------------------------------

const INSERT_HELP_REQUEST = `
  INSERT INTO help_requests (
    requester_name,
    contact_method,
    contact_value,
    need_type,
    description,
    latitude,
    longitude,
    urgency
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  RETURNING id,
            requester_name AS "requesterName",
            contact_method AS "contactMethod",
            contact_value AS "contactValue",
            need_type AS "needType",
            description,
            latitude, longitude, urgency, status,
            assigned_at AS "assignedAt",
            resolved_at AS "resolvedAt",
            created_at AS "createdAt"
`;

/**
 * @param {Object} payload — ya normalizado
 * @returns {Promise<Object>}
 */
async function insertHelpRequest(payload) {
  const result = await db.query(INSERT_HELP_REQUEST, [
    payload.requesterName,
    payload.contactMethod,
    payload.contactValue,
    payload.needType,
    payload.description,
    payload.latitude,
    payload.longitude,
    payload.urgency,
  ]);
  return result.rows[0];
}

const ACCEPT_HELP_REQUEST = `
  UPDATE help_requests
  SET volunteer_name = $2,
      volunteer_contact_method = $3,
      volunteer_contact_value = $4,
      status = 'assigned',
      assigned_at = NOW()
  WHERE id = $1 AND status = 'open'
  RETURNING id,
            requester_name AS "requesterName",
            contact_method AS "contactMethod",
            contact_value AS "contactValue",
            need_type AS "needType",
            description,
            latitude, longitude, urgency, status,
            created_at AS "createdAt",
            volunteer_name AS "volunteerName",
            volunteer_contact_method AS "volunteerContactMethod",
            volunteer_contact_value AS "volunteerContactValue",
            assigned_at AS "assignedAt",
            resolved_at AS "resolvedAt"
`;

/**
 * @param {string} id
 * @param {Object} payload — ya normalizado
 * @returns {Promise<Object|null>}
 */
async function acceptHelpRequestById(id, payload) {
  const result = await db.query(ACCEPT_HELP_REQUEST, [
    id,
    payload.volunteerName,
    payload.volunteerContactMethod,
    payload.volunteerContactValue,
  ]);
  return result.rows[0] || null;
}

const RESOLVE_HELP_REQUEST = `
  UPDATE help_requests
  SET status = 'resolved',
      resolved_at = NOW()
  WHERE id = $1 AND status = 'assigned'
  RETURNING id,
            requester_name AS "requesterName",
            contact_method AS "contactMethod",
            contact_value AS "contactValue",
            need_type AS "needType",
            description,
            latitude, longitude, urgency, status,
            created_at AS "createdAt",
            volunteer_name AS "volunteerName",
            volunteer_contact_method AS "volunteerContactMethod",
            volunteer_contact_value AS "volunteerContactValue",
            assigned_at AS "assignedAt",
            resolved_at AS "resolvedAt"
`;

/**
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
async function resolveHelpRequestById(id) {
  const result = await db.query(RESOLVE_HELP_REQUEST, [id]);
  return result.rows[0] || null;
}

const FIND_STATUS_BY_ID = "SELECT status FROM help_requests WHERE id = $1";

/**
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
async function findHelpRequestStatusById(id) {
  const result = await db.query(FIND_STATUS_BY_ID, [id]);
  return result.rows[0] || null;
}

const FIND_BY_ID = `
  SELECT id,
         requester_name AS "requesterName",
         contact_method AS "contactMethod",
         contact_value AS "contactValue",
         need_type AS "needType",
         description,
         latitude, longitude, urgency, status,
         volunteer_name AS "volunteerName",
         volunteer_contact_method AS "volunteerContactMethod",
         volunteer_contact_value AS "volunteerContactValue",
         assigned_at AS "assignedAt",
         resolved_at AS "resolvedAt",
         created_at AS "createdAt"
  FROM help_requests
  WHERE id = $1
`;

/**
 * Busca un help request por ID (fila completa).
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
async function findHelpRequestById(id) {
  const result = await db.query(FIND_BY_ID, [id]);
  return result.rows[0] || null;
}

module.exports = {
  // queries de lectura
  buildListHelpRequestsQuery,
  // queries de escritura
  insertHelpRequest,
  acceptHelpRequestById,
  resolveHelpRequestById,
  findHelpRequestStatusById,
  findHelpRequestById,
};
