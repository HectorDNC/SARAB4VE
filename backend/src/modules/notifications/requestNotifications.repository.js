/**
 * Repositorio — consultas SQL para notificaciones de nuevas solicitudes.
 *
 * Generalizado para cubrir tanto solicitudes de ayuda como emergencias: el
 * constructor de SQL es puro (devuelve { sql, values }) para poder probarlo
 * sin base de datos, y las funciones de ejecución usan el pool compartido.
 *
 * Sigue la convención del dominio help-requests.
 */
const db = require("../../db");

// ---------------------------------------------------------------------------
// Constructor de consulta
// ---------------------------------------------------------------------------

/**
 * Busca organizaciones aprobadas (por categoría de discapacidad + radio) y
 * voluntarios aprobados (solo por radio) que deban recibir el aviso.
 *
 * El orden de los parámetros es: longitud, latitud, radioKm, nombres de
 * categoría, usuario a excluir y límite. `ST_MakePoint` recibe primero la
 * longitud (x) y luego la latitud (y).
 *
 * `categoryNames` es un arreglo de nombres canónicos del catálogo
 * `disability_type`. Un arreglo vacío significa "sin filtro de categoría":
 * se avisa solo por radio a las organizaciones (y a todos los voluntarios).
 *
 * @param {Object} params
 * @param {number} params.latitude
 * @param {number} params.longitude
 * @param {number} params.radiusKm
 * @param {string[]} [params.categoryNames]
 * @param {string|null} [params.excludeUserId]
 * @param {number} params.limit
 * @returns {{ sql: string, values: Array }}
 */
function buildMatchingRecipientsQuery({
  latitude,
  longitude,
  radiusKm,
  categoryNames,
  excludeUserId,
  limit,
}) {
  const values = [];

  values.push(longitude);
  const lngIndex = values.length;

  values.push(latitude);
  const latIndex = values.length;

  values.push(radiusKm);
  const radiusIndex = values.length;

  // Un solo parámetro `text[]` para todas las categorías.
  values.push(Array.isArray(categoryNames) ? categoryNames : []);
  const categoriesIndex = values.length;

  values.push(excludeUserId ?? null);
  const excludeIndex = values.length;

  values.push(limit);
  const limitIndex = values.length;

  const sql = `
    SELECT DISTINCT
      u.id,
      u.email,
      u.full_name AS "fullName",
      u.role
    FROM users u
    WHERE u.role IN ('organization', 'volunteer')
      AND u.status = 'approved'
      AND u.email IS NOT NULL
      AND u.email <> ''
      AND COALESCE(u.notify_new_requests, true) = true
      AND u.location IS NOT NULL
      AND ST_DWithin(
            u.location,
            ST_SetSRID(ST_MakePoint($${lngIndex}::float8, $${latIndex}::float8), 4326)::geography,
            ($${radiusIndex}::float8 * 1000)
          )
      AND (
        u.role = 'volunteer'
        OR (
          u.role = 'organization'
          AND (
            cardinality($${categoriesIndex}::text[]) = 0
            OR EXISTS (
              SELECT 1
              FROM organization_disability_types odt
              JOIN catalog c
                ON c.id = odt.catalog_id
               AND c.type = odt.catalog_type
              WHERE odt.organization_id = u.id
                AND c.name = ANY($${categoriesIndex}::text[])
            )
          )
        )
      )
      AND ($${excludeIndex}::uuid IS NULL OR u.id <> $${excludeIndex}::uuid)
    ORDER BY u.role, u.id
    LIMIT $${limitIndex}::int
  `;

  return { sql, values };
}

// ---------------------------------------------------------------------------
// Ejecutores
// ---------------------------------------------------------------------------

/**
 * Ejecuta la consulta de destinatarios y devuelve sus filas.
 * @param {Object} params — ver buildMatchingRecipientsQuery
 * @returns {Promise<Array>}
 */
async function findMatchingRecipients(params) {
  const { sql, values } = buildMatchingRecipientsQuery(params);
  const result = await db.query(sql, values);
  return result.rows;
}

/**
 * Obtiene el correo de una cuenta por su id.
 * @param {string} userId
 * @returns {Promise<string|null>}
 */
async function findUserEmailById(userId) {
  const result = await db.query("SELECT email FROM users WHERE id = $1", [userId]);
  return result.rows[0]?.email || null;
}

module.exports = {
  buildMatchingRecipientsQuery,
  findMatchingRecipients,
  findUserEmailById,
};
