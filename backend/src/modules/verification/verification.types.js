/**
 * Tipos — definiciones JSDoc para el dominio de verificación.
 *
 * Cubre el flujo de registro y verificación de Organizaciones y Voluntarios
 * (Profesional / No Profesional).
 *
 * @module verification.types
 */

/**
 * @typedef {"organization"|"volunteer_professional"|"volunteer_non_professional"} EntityType
 */

/**
 * @typedef {"entregada"|"en_estudio"|"rechazada"|"aceptada"} VerificationStatus
 */

/**
 * @typedef {"pending"|"approved"|"rejected"} DocumentStatus
 */

/**
 * @typedef {"professional"|"non_professional"} VolunteerType
 */

/**
 * @typedef {"presential"|"online"|"both"} AvailabilityMode
 */

/**
 * @typedef {"organization_type"|"disability_type"|"service"|"interest_area"|"experience_category"} CatalogType
 */

// ---------------------------------------------------------------------------
// Payloads de registro
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} OrganizationRegisterInput
 * @property {string} userId              — UUID del usuario (ya autenticado)
 * @property {number} organizationTypeId  — ID del catálogo (type = 'organization_type')
 * @property {string} [taxId]             — CIF/NIF
 * @property {string} [registryNumber]
 * @property {string} [foundedAt]         — ISO 8601 date
 * @property {string} [country]
 * @property {string} [province]
 * @property {string} [city]
 * @property {string} [address]
 * @property {string} [website]
 * @property {Object} [socialLinks]       — JSONB, ej: { instagram: "...", facebook: "..." }
 * @property {string} [mission]
 * @property {string} [vision]
 * @property {string} [scope]
 * @property {string} [servedGroups]
 * @property {Object[]} [legalRepresentatives] — { fullName, position, phone, email }
 * @property {number[]} [disabilityTypeIds]    — IDs del catálogo (type = 'disability_type')
 * @property {number[]} [serviceIds]           — IDs del catálogo (type = 'service')
 */

/**
 * @typedef {Object} VolunteerRegisterInput
 * @property {string} userId             — UUID del usuario (ya autenticado)
 * @property {VolunteerType} volunteerType
 * @property {string} [documentType]     — cédula, pasaporte, etc.
 * @property {string} [documentNumber]
 * @property {string} [birthDate]        — ISO 8601 date
 * @property {string} [profession]
 * @property {string[]} [languages]
 * @property {AvailabilityMode} [availabilityMode]
 * @property {boolean} [hasPriorExperience]
 * @property {boolean} [transportAvailable]
 * @property {number[]} [interestAreaIds]       — IDs del catálogo (type = 'interest_area')
 * @property {number[]} [experienceCategoryIds] — IDs del catálogo (type = 'experience_category')
 */

// ---------------------------------------------------------------------------
// Documentos
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} DocumentUploadInput
 * @property {string} ownerId          — UUID del usuario dueño del documento
 * @property {number} documentTypeId   — ID del tipo de documento requerido
 * @property {string} fileName         — Nombre original del archivo
 * @property {string} mimeType         — MIME type del archivo
 */

/**
 * @typedef {Object} DocumentReviewInput
 * @property {DocumentStatus} status
 * @property {string} [reason]
 */

// ---------------------------------------------------------------------------
// Transición de estado (admin)
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} TransitionInput
 * @property {VerificationStatus} toStatus
 * @property {string} [reason]
 */

// ---------------------------------------------------------------------------
// Filas de base de datos
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} CatalogRow
 * @property {number} id
 * @property {CatalogType} type
 * @property {string} name
 */

/**
 * @typedef {Object} DocumentTypeRow
 * @property {number} id
 * @property {string} code
 * @property {string} name
 * @property {EntityType} entityType
 * @property {boolean} isRequired
 */

/**
 * @typedef {Object} VerificationRequestRow
 * @property {number} id
 * @property {string} ownerId
 * @property {EntityType} entityType
 * @property {VerificationStatus} status
 * @property {string|null} rejectionReason
 * @property {string} submittedAt
 * @property {string|null} reviewedBy
 * @property {string|null} reviewedAt
 */

/**
 * @typedef {Object} VerificationDocumentRow
 * @property {number} id
 * @property {string} ownerId
 * @property {number} documentTypeId
 * @property {string} storageKey
 * @property {DocumentStatus} status
 * @property {string|null} rejectionReason
 * @property {string} uploadedAt
 * @property {string|null} reviewedBy
 * @property {string|null} reviewedAt
 */

// ---------------------------------------------------------------------------
// Resultados del servicio
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} ServiceResult
 * @property {Object} [data]
 * @property {string[]} [errors]
 * @property {number} [status]
 */

module.exports = {};
