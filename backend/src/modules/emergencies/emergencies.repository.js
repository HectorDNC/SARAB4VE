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
    disability_type, status, created_at
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

module.exports = {
  buildDistanceExpression,
  buildListEmergenciesQuery,
};
