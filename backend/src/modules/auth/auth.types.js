/**
 * Tipos — definiciones JSDoc para el dominio de autenticación y registro.
 *
 * @module auth.types
 */

/**
 * @typedef {"citizen"|"volunteer"|"organization"|"admin"} UserRole
 */

/**
 * @typedef {"pending"|"approved"|"rejected"|"suspended"} UserStatus
 */

/**
 * @typedef {Object} LocationInput
 * @property {number} lat  — Latitud en grados decimales (-90 a 90)
 * @property {number} lng  — Longitud en grados decimales (-180 a 180)
 */

/**
 * DTO de registro para ciudadano.
 * @typedef {Object} RegisterCitizenInput
 * @property {string}       fullName
 * @property {string}       email
 * @property {string}       phone
 * @property {string}       password       — Texto plano, se hashea en el servicio
 * @property {LocationInput} [location]
 * @property {string}       [zone]
 */

/**
 * DTO de registro para voluntario.
 * @typedef {Object} RegisterVolunteerInput
 * @property {string}       fullName
 * @property {string}       email
 * @property {string}       phone
 * @property {string}       password
 * @property {LocationInput} [location]
 * @property {string}       [zone]
 * @property {string[]}     skills         — Al menos una habilidad requerida
 * @property {number}       availableHours — Horas semanales disponibles (1-168)
 * @property {string[]}     availableDays  — Días de la semana en español
 * @property {boolean}      acceptedTerms  — Debe ser true
 */

/**
 * DTO de registro para organización.
 * @typedef {Object} RegisterOrganizationInput
 * @property {string}       fullName
 * @property {string}       email
 * @property {string}       phone
 * @property {string}       password
 * @property {LocationInput} [location]
 * @property {string}       [zone]
 * @property {string}       organizationName — Nombre legal de la organización
 * @property {string}       legalDocument    — RIF / documento legal
 * @property {string[]}     [workArea]       — Áreas de trabajo (ej: salud, educación)
 * @property {boolean}      acceptedTerms    — Debe ser true
 */

/**
 * DTO de registro para administrador.
 * Protegido por ADMIN_SECRET — solo se puede crear si se envía el secreto correcto.
 * @typedef {Object} RegisterAdminInput
 * @property {string}       fullName
 * @property {string}       email
 * @property {string}       phone
 * @property {string}       password       — Texto plano, se hashea en el servicio
 * @property {string}       adminSecret    — Secreto compartido para autorizar la creación
 * @property {LocationInput} [location]
 * @property {string}       [zone]
 */

/**
 * Fila retornada por SELECT en users (sin password_hash).
 * @typedef {Object} UserRow
 * @property {string}      id
 * @property {string}      full_name
 * @property {string}      email
 * @property {string}      phone
 * @property {UserRole}    role
 * @property {UserStatus}  status
 * @property {Object|null} location   — GeoJSON point o null
 * @property {string|null} zone
 * @property {boolean}     phone_verified
 * @property {boolean}     email_verified
 * @property {string}      created_at
 * @property {string}      updated_at
 */

/**
 * Fila retornada por SELECT en user_details.
 * @typedef {Object} UserDetailsRow
 * @property {string}      user_id
 * @property {string[]}    skills
 * @property {number}      available_hours
 * @property {string[]}    available_days
 * @property {string|null} organization_name
 * @property {string|null} legal_document
 * @property {string[]}    work_area
 * @property {boolean}     accepted_terms
 * @property {string|null} terms_accepted_at
 * @property {string|null} approved_by
 * @property {string|null} approved_at
 * @property {string}      updated_at
 */

/**
 * Payload del JWT almacenado en el token de acceso.
 * Se inyecta en req.user por el middleware authenticate.
 * @typedef {Object} JwtPayload
 * @property {string}      userId — UUID del usuario
 * @property {UserRole}    role   — Rol del usuario
 * @property {UserStatus}  status — Estado del registro
 */

/**
 * Respuesta del endpoint POST /api/auth/login.
 * @typedef {Object} LoginResponse
 * @property {string}  token — JWT firmado
 * @property {UserRow} user  — Datos del usuario sin password_hash
 */

/**
 * Extension del tipo Request de Express para incluir req.user.
 * Se aplica mediante JSDoc en los handlers que usan authenticate.
 *
 * @typedef {Object} AuthenticatedRequest
 * @property {JwtPayload} user — Inyectado por el middleware authenticate
 */

module.exports = {};
