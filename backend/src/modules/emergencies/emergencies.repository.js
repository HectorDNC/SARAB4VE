/**
 * Repositorio — consultas SQL para el dominio de emergencias.
 */

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

  if (filters.status) {
    values.push(filters.status);
    baseConditions.push(`status = $${values.length}`);
  }

  // Solo lo necesario para pintar marcadores en el mapa.
  // El detalle completo se obtiene con GET /api/emergencies/:id
  const columns = `
    id, latitude, longitude, urgency, need_type,
    disability_type, status, created_at, requester_name
  `;

  if (!filters.hasGeoFilter) {
    let sql = `SELECT ${columns} FROM emergencies`;

    if (baseConditions.length > 0) {
      sql += ` WHERE ${baseConditions.join(" AND ")}`;
    }

    sql += " ORDER BY created_at DESC LIMIT 50";

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
    ORDER BY "distanceKm" ASC, created_at DESC
    LIMIT 50
  `;

  return { sql, values };
}

const FIND_BY_ID = `
  SELECT id, requester_name, is_injured, cannot_move, disability_type,
         communication_mode, disability_subcategory, extra_info,
         voice_note_url, voice_note_duration_sec,
         latitude, longitude, urgency, need_type, description,
         status, assigned_at, resolved_at, created_at, updated_at
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

module.exports = {
  buildDistanceExpression,
  buildListEmergenciesQuery,
  findEmergencyById,
};
