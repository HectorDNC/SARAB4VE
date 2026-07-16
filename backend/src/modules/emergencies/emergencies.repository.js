/**
 * Repositorio — consultas SQL para el dominio de emergencias.
 */
const db = require("../../db");

/**
 * Expresión de distancia geográfica mediante la fórmula del haversine.
 * @param {number} latitudeIndex  — índice posicional ($N) de la latitud
 * @param {number} longitudeIndex — índice posicional ($N) de la longitud
 * @returns {string} expresión SQL
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

/**
 * Construye la query dinámica para listar emergencias.
 * Soporta filtro por status y búsqueda por geolocalización (radio en km).
 *
 * @param {Object} filters — salida de validateSearchEmergencies().filters
 * @returns {{ sql: string, values: Array }}
 */
function buildListEmergenciesQuery(filters) {
  const values = [];
  const baseConditions = [];

  if (filters.statuses && filters.statuses.length > 0) {
    const placeholders = filters.statuses.map((_, i) => `$${values.length + i + 1}`).join(", ");
    values.push(...filters.statuses);
    baseConditions.push(`status IN (${placeholders})`);
  }

  // Solo lo necesario para pintar marcadores en el mapa.
  // El detalle completo se obtiene con GET /api/emergencies/:id
  const columns = `
    id, latitude, longitude, urgency,
    need_type AS "needType",
    disability_type AS "disabilityType",
    status, created_at AS "createdAt",
    requester_name AS "requesterName"
  `;

  if (!filters.hasGeoFilter) {
    let sql = `SELECT ${columns} FROM emergencies`;

    if (baseConditions.length > 0) {
      sql += ` WHERE ${baseConditions.join(" AND ")}`;
    }

    sql += " ORDER BY \"createdAt\" DESC LIMIT 50";

    return { sql, values };
  }

  values.push(filters.latitude);
  const latitudeIndex = values.length;
  values.push(filters.longitude);
  const longitudeIndex = values.length;
  values.push(filters.radiusKm);
  const radiusIndex = values.length;

  const distanceExpression = buildDistanceExpression(latitudeIndex, longitudeIndex);
  const whereClause =
    baseConditions.length > 0
      ? `WHERE ${baseConditions.join(" AND ")}`
      : "";

  const sql = `
    WITH scoped_emergencies AS (
      SELECT ${columns},
             ROUND((${distanceExpression})::numeric, 3) AS "distanceKm"
      FROM emergencies
      ${whereClause}
    )
    SELECT *
    FROM scoped_emergencies
    WHERE "distanceKm" <= $${radiusIndex}
    ORDER BY "distanceKm" ASC, "createdAt" DESC
    LIMIT 50
  `;

  return { sql, values };
}

const FIND_BY_ID = `
  SELECT id,
         requester_name AS "requesterName",
         is_injured AS "isInjured",
         cannot_move AS "cannotMove",
         disability_type AS "disabilityType",
         communication_mode AS "communicationMode",
         disability_subcategory AS "disabilitySubcategory",
         extra_info AS "extraInfo",
         voice_note_url AS "voiceNoteUrl",
         voice_note_duration_sec AS "voiceNoteDurationSec",
         latitude, longitude, urgency,
         need_type AS "needType",
         description, status,
         assigned_at AS "assignedAt",
         resolved_at AS "resolvedAt",
         created_at AS "createdAt",
         updated_at AS "updatedAt"
  FROM emergencies
  WHERE id = $1
`;

/**
 * Busca una emergencia por ID (fila completa).
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
async function findEmergencyById(id, db) {
  const result = await db.query(FIND_BY_ID, [id]);
  return result.rows[0] || null;
}

// ---------------------------------------------------------------------------
// Queries de actualización
// ---------------------------------------------------------------------------

const UPDATE_STATUS_TO_ASSIGNED = `
  UPDATE emergencies
  SET status = 'assigned',
      assigned_at = NOW()
  WHERE id = $1 AND status = 'received'
  RETURNING id, status, assigned_at AS "assignedAt"
`;

/**
 * Cambia el estado de una emergencia de "received" a "assigned".
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
async function updateEmergencyStatusToAssigned(id) {
  const result = await db.query(UPDATE_STATUS_TO_ASSIGNED, [id]);
  return result.rows[0] || null;
}

module.exports = {
  buildDistanceExpression,
  buildListEmergenciesQuery,
  findEmergencyById,
  updateEmergencyStatusToAssigned,
};
