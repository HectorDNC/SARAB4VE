/**
 * Tipos — definiciones JSDoc para el dominio de administración de usuarios.
 *
 * @module users.types
 */

/**
 * @typedef {"citizen"|"volunteer"|"organization"|"admin"} UserRole
 */

/**
 * @typedef {"pending"|"approved"|"rejected"|"suspended"} UserStatus
 */

/**
 * Fila retornada por SELECT en users (sin password_hash).
 * Las keys se normalizan a camelCase en el repositorio.
 * @typedef {Object} UserRow
 * @property {string}      id
 * @property {string}      fullName
 * @property {string}      email
 * @property {string}      phone
 * @property {UserRole}    role
 * @property {UserStatus}  status
 * @property {Object|null} location   — GeoJSON point o null
 * @property {string|null} zone
 * @property {boolean}     phoneVerified
 * @property {boolean}     emailVerified
 * @property {string}      createdAt
 * @property {string}      updatedAt
 */

/**
 * Fila retornada por SELECT en user_details (keys normalizadas a camelCase).
 * @typedef {Object} UserDetailsRow
 * @property {string}      userId
 * @property {string[]}    skills
 * @property {number}      availableHours
 * @property {string[]}    availableDays
 * @property {string|null} organizationName
 * @property {string|null} legalDocument
 * @property {string[]}    workArea
 * @property {boolean}     acceptedTerms
 * @property {string|null} termsAcceptedAt
 * @property {string|null} approvedBy
 * @property {string|null} approvedAt
 * @property {string}      updatedAt
 */

/**
 * Filtros para listar usuarios.
 * @typedef {Object} ListUsersFilters
 * @property {UserRole}   [role]   — Filtrar por rol
 * @property {UserStatus} [status] — Filtrar por estado
 * @property {string}     [search] — Búsqueda por nombre o email
 * @property {number}     [limit]  — Máximo de resultados (default 50)
 * @property {number}     [offset] — Offset para paginación (default 0)
 */

/**
 * Resultado de la consulta de listado de usuarios.
 * @typedef {Object} ListUsersResult
 * @property {UserRow[]} users      — Lista de usuarios
 * @property {number}    total      — Total de usuarios que coinciden con los filtros
 * @property {number}    limit      — Límite aplicado
 * @property {number}    offset     — Offset aplicado
 */

/**
 * DTO para actualizar un usuario (PATCH /api/users/:id).
 * Todos los campos son opcionales.
 * @typedef {Object} UpdateUserInput
 * @property {string}       [fullName]
 * @property {string}       [email]
 * @property {string}       [phone]
 * @property {string}       [zone]
 * @property {Object}       [location]  — { lat, lng }
 * @property {string}       [password]  — Nueva contraseña (si se desea cambiar)
 */

/**
 * Payload del JWT inyectado por authenticate.
 * @typedef {Object} JwtPayload
 * @property {string}      userId
 * @property {UserRole}    role
 * @property {UserStatus}  status
 */

module.exports = {};
