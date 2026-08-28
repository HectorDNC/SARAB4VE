/**
 * Repositorio — consultas SQL para el dominio de administración de usuarios.
 * Todas las funciones de escritura reciben un cliente de transacción (PoolClient)
 * para que el servicio pueda coordinarlas atómicamente.
 */
const db = require("../../db");

// ---------------------------------------------------------------------------
// Constantes — columnas explícitas (nunca SELECT *)
// ---------------------------------------------------------------------------

/** Columnas que se retornan al consultar un usuario (sin passwordHash). */
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
  user_id AS "userId",
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
// SELECT — listar usuarios con filtros y paginación
// ---------------------------------------------------------------------------

/**
 * Construye dinámicamente la consulta de listado con filtros opcionales.
 * @param {Object} filters
 * @param {string} [filters.role]
 * @param {string} [filters.status]
 * @param {string} [filters.search]
 * @param {number} [filters.limit]
 * @param {number} [filters.offset]
 * @returns {{ text: string, params: Array }}
 */
function buildListUsersQuery(filters = {}) {
  const conditions = [];
  const params = [];
  let paramIndex = 1;

  if (filters.role) {
    conditions.push(`u.role = $${paramIndex++}`);
    params.push(filters.role);
  }

  if (filters.status) {
    conditions.push(`u.status = $${paramIndex++}`);
    params.push(filters.status);
  }

  if (filters.search) {
    conditions.push(
      `(u.full_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`,
    );
    params.push(`%${filters.search}%`);
    paramIndex++;
  }

  const whereClause = conditions.length > 0
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  const limit = filters.limit || 50;
  const offset = filters.offset || 0;

  // Consulta de datos
  const dataQuery = `
    SELECT ${USER_SELECT_COLUMNS}
    FROM users u
    ${whereClause}
    ORDER BY u.created_at DESC
    LIMIT $${paramIndex++} OFFSET $${paramIndex++}
  `;

  const dataParams = [...params, limit, offset];

  // Consulta de conteo
  const countQuery = `
    SELECT COUNT(*)::int AS total
    FROM users u
    ${whereClause}
  `;

  return { dataQuery, countQuery, dataParams, countParams: params };
}

/**
 * Lista usuarios con filtros opcionales y paginación.
 * @param {Object} filters
 * @returns {Promise<{ users: Object[], total: number, limit: number, offset: number }>}
 */
async function listUsers(filters = {}) {
  const { dataQuery, countQuery, dataParams, countParams } =
    buildListUsersQuery(filters);

  const [dataResult, countResult] = await Promise.all([
    db.query(dataQuery, dataParams),
    db.query(countQuery, countParams),
  ]);

  return {
    users: dataResult.rows,
    total: countResult.rows[0]?.total || 0,
    limit: filters.limit || 50,
    offset: filters.offset || 0,
  };
}

// ---------------------------------------------------------------------------
// SELECT — estadísticas agregadas por rol y estado
// ---------------------------------------------------------------------------

const USER_STATS_QUERY = `
  SELECT role, status, COUNT(*)::int AS count
  FROM users
  GROUP BY role, status
`;

/**
 * Obtiene el conteo de usuarios agrupado por rol y estado.
 * @returns {Promise<{ role: string, status: string, count: number }[]>}
 */
async function getUserStats() {
  const result = await db.query(USER_STATS_QUERY);
  return result.rows;
}

// ---------------------------------------------------------------------------
// SELECT — buscar usuario por ID
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

// ---------------------------------------------------------------------------
// SELECT — buscar detalles de usuario
// ---------------------------------------------------------------------------

const FIND_USER_DETAILS_BY_ID = `
  SELECT ${USER_DETAILS_SELECT_COLUMNS}
  FROM user_details
  WHERE user_id = $1
`;

/**
 * Busca los detalles de un usuario (skills, org info, etc.).
 * @param {string} userId
 * @returns {Promise<Object|null>}
 */
async function findUserDetailsById(userId) {
  const result = await db.query(FIND_USER_DETAILS_BY_ID, [userId]);
  return result.rows[0] || null;
}

// ---------------------------------------------------------------------------
// UPDATE — actualizar datos básicos del usuario
// ---------------------------------------------------------------------------

/**
 * Construye dinámicamente el UPDATE de users con solo los campos enviados.
 * @param {import("pg").PoolClient} client — Cliente de transacción
 * @param {string} userId
 * @param {Object} updates — Campos a actualizar (fullName, email, phone, zone, location, passwordHash)
 * @returns {Promise<Object>} — Fila actualizada sin password_hash
 */
async function updateUser(client, userId, updates) {
  const setClauses = [];
  const params = [];
  let paramIndex = 1;

  // Siempre actualizar updated_at
  setClauses.push(`updated_at = NOW()`);

  if (updates.fullName !== undefined) {
    setClauses.push(`full_name = $${paramIndex++}`);
    params.push(updates.fullName);
  }

  if (updates.email !== undefined) {
    setClauses.push(`email = $${paramIndex++}`);
    params.push(updates.email);
  }

  if (updates.phone !== undefined) {
    setClauses.push(`phone = $${paramIndex++}`);
    params.push(updates.phone);
  }

  if (updates.zone !== undefined) {
    setClauses.push(`zone = $${paramIndex++}`);
    params.push(updates.zone);
  }

  if (updates.location !== undefined) {
    setClauses.push(
      `location = CASE WHEN $${paramIndex}::jsonb IS NOT NULL THEN ST_SetSRID(ST_MakePoint(($${paramIndex}->>'lng')::float, ($${paramIndex}->>'lat')::float), 4326)::geography ELSE NULL END`,
    );
    params.push(updates.location ? JSON.stringify(updates.location) : null);
    paramIndex++;
  }

  if (updates.passwordHash !== undefined) {
    setClauses.push(`password_hash = $${paramIndex++}`);
    params.push(updates.passwordHash);
  }

  // Si no hay nada que actualizar (solo updated_at), no hacemos nada
  if (setClauses.length === 1 && updates.passwordHash === undefined) {
    // Solo updated_at — devolver el usuario sin cambios
    return findUserById(userId);
  }

  params.push(userId);

  const query = `
    UPDATE users
    SET ${setClauses.join(", ")}
    WHERE id = $${paramIndex}
    RETURNING ${USER_SELECT_COLUMNS}
  `;

  const result = await (client || db).query(query, params);
  return result.rows[0] || null;
}

// ---------------------------------------------------------------------------
// UPDATE — cambiar estado del usuario (aprobar/rechazar)
// ---------------------------------------------------------------------------

/**
 * Actualiza el estado de un usuario. Si es 'approved', también actualiza
 * user_details con approved_by y approved_at.
 *
 * @param {import("pg").PoolClient} client — Cliente de transacción
 * @param {string} userId
 * @param {"approved"|"rejected"|"suspended"} newStatus
 * @param {string} approvedBy — UUID del admin que aprueba/rechaza
 * @returns {Promise<Object>} — Fila actualizada sin password_hash
 */
async function updateUserStatus(client, userId, newStatus, approvedBy) {
  const updateUserQuery = `
    UPDATE users
    SET status = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING ${USER_SELECT_COLUMNS}
  `;

  const result = await client.query(updateUserQuery, [newStatus, userId]);

  // Si es approved, actualizar user_details
  if (newStatus === "approved") {
    const updateDetailsQuery = `
      UPDATE user_details
      SET approved_by = $1, approved_at = NOW(), updated_at = NOW()
      WHERE user_id = $2
    `;
    await client.query(updateDetailsQuery, [approvedBy, userId]);
  }

  return result.rows[0] || null;
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
// SELECT — obtener perfil completo de organización
// ---------------------------------------------------------------------------

const ORGANIZATION_PROFILE_SELECT = `
  user_id AS "userId",
  organization_type_id AS "organizationTypeId",
  tax_id AS "taxId",
  registry_number AS "registryNumber",
  founded_at AS "foundedAt",
  country, province, city, address,
  website, social_links AS "socialLinks",
  mission, vision, scope,
  served_groups AS "servedGroups",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

/**
 * Obtiene el perfil completo de una organización.
 * @param {string} userId - ID del usuario/organización
 * @returns {Promise<Object|null>}
 */
async function findOrganizationProfileById(userId) {
  const query = `
    SELECT ${ORGANIZATION_PROFILE_SELECT}
    FROM organization_profiles
    WHERE user_id = $1
  `;
  const result = await db.query(query, [userId]);
  return result.rows[0] || null;
}

/**
 * Obtiene los representantes legales de una organización.
 * @param {string} organizationId - ID de la organización
 * @returns {Promise<Array>}
 */
async function findLegalRepresentatives(organizationId) {
  const query = `
    SELECT id, full_name AS "fullName", position, phone, email, created_at AS "createdAt"
    FROM legal_representatives
    WHERE organization_id = $1
    ORDER BY created_at ASC
  `;
  const result = await db.query(query, [organizationId]);
  return result.rows;
}

/**
 * Obtiene los tipos de discapacidad asociados a una organización.
 * @param {string} organizationId - ID de la organización
 * @returns {Promise<Array>}
 */
async function findOrganizationDisabilityTypes(organizationId) {
  const query = `
    SELECT c.id, c.name, c.type
    FROM organization_disability_types odt
    JOIN catalog c ON c.id = odt.catalog_id
    WHERE odt.organization_id = $1
    ORDER BY c.name ASC
  `;
  const result = await db.query(query, [organizationId]);
  return result.rows;
}

/**
 * Obtiene los servicios asociados a una organización.
 * @param {string} organizationId - ID de la organización
 * @returns {Promise<Array>}
 */
async function findOrganizationServices(organizationId) {
  const query = `
    SELECT c.id, c.name, c.type
    FROM organization_services os
    JOIN catalog c ON c.id = os.catalog_id
    WHERE os.organization_id = $1
    ORDER BY c.name ASC
  `;
  const result = await db.query(query, [organizationId]);
  return result.rows;
}

/**
 * Obtiene la solicitud de verificación de un usuario.
 * @param {string} ownerId - ID del usuario
 * @returns {Promise<Object|null>}
 */
async function findVerificationByOwner(ownerId) {
  const query = `
    SELECT id, owner_id AS "ownerId", entity_type AS "entityType", status,
           rejection_reason AS "rejectionReason",
           submitted_at AS "submittedAt",
           reviewed_by AS "reviewedBy", reviewed_at AS "reviewedAt"
    FROM verification_requests
    WHERE owner_id = $1
  `;
  const result = await db.query(query, [ownerId]);
  return result.rows[0] || null;
}

/**
 * Obtiene los documentos de verificación de un usuario.
 * @param {string} ownerId - ID del usuario
 * @returns {Promise<Array>}
 */
async function findVerificationDocuments(ownerId) {
  const query = `
    SELECT vd.id, vd.document_type_id AS "documentTypeId",
           vd.storage_key AS "storageKey", vd.status,
           vd.rejection_reason AS "rejectionReason",
           vd.uploaded_at AS "uploadedAt",
           vd.reviewed_by AS "reviewedBy", vd.reviewed_at AS "reviewedAt",
           dt.code AS "documentTypeCode", dt.name AS "documentTypeName"
    FROM verification_documents vd
    JOIN document_types dt ON dt.id = vd.document_type_id
    WHERE vd.owner_id = $1
    ORDER BY vd.uploaded_at ASC
  `;
  const result = await db.query(query, [ownerId]);
  return result.rows;
}

// ---------------------------------------------------------------------------
// SELECT — obtener perfil completo de voluntario
// ---------------------------------------------------------------------------

const VOLUNTEER_PROFILE_SELECT = `
  user_id AS "userId",
  volunteer_type AS "volunteerType",
  document_type AS "documentType",
  document_number AS "documentNumber",
  birth_date AS "birthDate",
  profession, languages,
  availability_mode AS "availabilityMode",
  has_prior_experience AS "hasPriorExperience",
  transport_available AS "transportAvailable",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

/**
 * Obtiene el perfil completo de un voluntario.
 * @param {string} userId - ID del usuario/voluntario
 * @returns {Promise<Object|null>}
 */
async function findVolunteerProfileById(userId) {
  const query = `
    SELECT ${VOLUNTEER_PROFILE_SELECT}
    FROM volunteer_profiles
    WHERE user_id = $1
  `;
  const result = await db.query(query, [userId]);
  return result.rows[0] || null;
}

/**
 * Obtiene las áreas de interés de un voluntario.
 * @param {string} userId - ID del voluntario
 * @returns {Promise<Array>}
 */
async function findVolunteerInterestAreas(userId) {
  const query = `
    SELECT c.id, c.name, c.type
    FROM volunteer_interest_areas via
    JOIN catalog c ON c.id = via.catalog_id
    WHERE via.user_id = $1
    ORDER BY c.name ASC
  `;
  const result = await db.query(query, [userId]);
  return result.rows;
}

/**
 * Obtiene las categorías de experiencia de un voluntario.
 * @param {string} userId - ID del voluntario
 * @returns {Promise<Array>}
 */
async function findVolunteerExperience(userId) {
  const query = `
    SELECT c.id, c.name, c.type
    FROM volunteer_experience ve
    JOIN catalog c ON c.id = ve.catalog_id
    WHERE ve.user_id = $1
    ORDER BY c.name ASC
  `;
  const result = await db.query(query, [userId]);
  return result.rows;
}

module.exports = {
  USER_SELECT_COLUMNS,
  USER_DETAILS_SELECT_COLUMNS,
  buildListUsersQuery,
  listUsers,
  getUserStats,
  findUserById,
  findUserDetailsById,
  findOrganizationProfileById,
  findLegalRepresentatives,
  findOrganizationDisabilityTypes,
  findVolunteerProfileById,
  findVolunteerInterestAreas,
  findVolunteerExperience,
  findOrganizationServices,
  findVerificationByOwner,
  findVerificationDocuments,
  updateUser,
  updateUserStatus,
  withTransaction,
};
