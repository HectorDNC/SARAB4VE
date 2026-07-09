/**
 * Repositorio — consultas SQL para el dominio de auth (registro de usuarios).
 * Todas las funciones de escritura reciben un cliente de transacción (PoolClient)
 * para que el servicio pueda coordinarlas atómicamente.
 */
const db = require("../../db");

// ---------------------------------------------------------------------------
// Constantes — columnas explícitas (nunca SELECT *)
// ---------------------------------------------------------------------------

/** Columnas que se retornan al crear un usuario (sin passwordHash). */
const USER_SELECT_COLUMNS = `
  id,
  full_name AS "fullName",
  email,
  phone,
  role,
  status,
  ST_AsGeoJSON(location)::json AS location,
  zone,
  phone_verified AS "phoneVerified",
  email_verified AS "emailVerified",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

/** Columnas de user_details. */
const USER_DETAILS_SELECT_COLUMNS = `
  skills,
  available_hours AS "availableHours",
  available_days AS "availableDays",
  organization_name AS "organizationName",
  legal_document AS "legalDocument",
  work_area AS "workArea",
  accepted_terms AS "acceptedTerms",
  terms_accepted_at AS "termsAcceptedAt",
  approved_by AS "approvedBy",
  approved_at AS "approvedAt",
  updated_at AS "updatedAt"
`;

// ---------------------------------------------------------------------------
// INSERT — users
// ---------------------------------------------------------------------------

const INSERT_USER = `
  INSERT INTO users (
    full_name,
    email,
    phone,
    password_hash,
    role,
    status,
    location,
    zone
  )
  VALUES (
    $1, $2, $3, $4, $5, $6,
    CASE
      WHEN $7::jsonb IS NOT NULL
      THEN ST_SetSRID(ST_MakePoint(($7->>'lng')::float, ($7->>'lat')::float), 4326)::geography
      ELSE NULL
    END,
    $8
  )
  RETURNING ${USER_SELECT_COLUMNS}
`;

/**
 * Inserta un registro en la tabla users.
 * @param {import("pg").PoolClient} client — Cliente de transacción
 * @param {Object} user — Payload normalizado del usuario
 * @param {string} user.fullName
 * @param {string} user.email
 * @param {string} user.phone
 * @param {string} user.passwordHash — Ya hasheado por el servicio
 * @param {string} user.role
 * @param {string} user.status
 * @param {Object|null} user.location — { lat, lng } o null
 * @param {string|null} user.zone
 * @returns {Promise<Object>} — Fila insertada sin password_hash
 */
async function insertUser(client, user) {
  const locationJson = user.location ? JSON.stringify(user.location) : null;

  const result = await client.query(INSERT_USER, [
    user.fullName,
    user.email,
    user.phone,
    user.passwordHash,
    user.role,
    user.status,
    locationJson,
    user.zone,
  ]);

  return result.rows[0];
}

// ---------------------------------------------------------------------------
// INSERT — user_details
// ---------------------------------------------------------------------------

const INSERT_USER_DETAILS = `
  INSERT INTO user_details (
    user_id,
    skills,
    available_hours,
    available_days,
    organization_name,
    legal_document,
    work_area,
    accepted_terms,
    terms_accepted_at
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
  RETURNING ${USER_DETAILS_SELECT_COLUMNS}
`;

/**
 * Inserta un registro en la tabla user_details.
 * @param {import("pg").PoolClient} client — Cliente de transacción
 * @param {string} userId — UUID del usuario recién creado
 * @param {Object} details — Payload normalizado de detalles
 * @param {string[]} [details.skills]
 * @param {number} [details.availableHours]
 * @param {string[]} [details.availableDays]
 * @param {string} [details.organizationName]
 * @param {string} [details.legalDocument]
 * @param {string[]} [details.workArea]
 * @param {boolean} details.acceptedTerms
 * @returns {Promise<Object>} — Fila insertada
 */
async function insertUserDetails(client, userId, details) {
  const result = await client.query(INSERT_USER_DETAILS, [
    userId,
    details.skills || null,
    details.availableHours || null,
    details.availableDays || null,
    details.organizationName || null,
    details.legalDocument || null,
    details.workArea || null,
    details.acceptedTerms,
  ]);

  return result.rows[0];
}

// ---------------------------------------------------------------------------
// Helpers de transacción
// ---------------------------------------------------------------------------

/**
 * Abre una transacción y ejecuta el callback.
 * Hace commit si el callback resuelve, rollback si lanza error.
 * Siempre libera el cliente al final.
 *
 * @template T
 * @param {(client: import("pg").PoolClient) => Promise<T>} callback
 * @returns {Promise<T>}
 */
async function withTransaction(callback) {
  const client = await db.getClient();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// SELECT — búsqueda por email (para login, incluye password_hash)
// ---------------------------------------------------------------------------

const FIND_USER_BY_EMAIL = `
  SELECT
    id,
    full_name AS "fullName",
    email,
    phone,
    password_hash AS "passwordHash",
    role,
    status,
    ST_AsGeoJSON(location)::json AS location,
    zone,
    phone_verified AS "phoneVerified",
    email_verified AS "emailVerified",
    created_at AS "createdAt",
    updated_at AS "updatedAt"
  FROM users
  WHERE email = $1
`;

/**
 * Busca un usuario por email. Retorna todas las columnas incluyendo password_hash
 * para que el servicio pueda comparar contraseñas.
 * @param {string} email
 * @returns {Promise<Object|null>}
 */
async function findUserByEmail(email) {
  const result = await db.query(FIND_USER_BY_EMAIL, [email.toLowerCase().trim()]);
  return result.rows[0] || null;
}

// ---------------------------------------------------------------------------
// SELECT — búsqueda por ID (para /me, sin password_hash)
// ---------------------------------------------------------------------------

const FIND_USER_BY_ID = `
  SELECT ${USER_SELECT_COLUMNS}
  FROM users
  WHERE id = $1
`;

/**
 * Busca un usuario por ID. No retorna password_hash.
 * @param {string} userId
 * @returns {Promise<Object|null>}
 */
async function findUserById(userId) {
  const result = await db.query(FIND_USER_BY_ID, [userId]);
  return result.rows[0] || null;
}

module.exports = {
  USER_SELECT_COLUMNS,
  USER_DETAILS_SELECT_COLUMNS,
  insertUser,
  insertUserDetails,
  withTransaction,
  findUserByEmail,
  findUserById,
};
