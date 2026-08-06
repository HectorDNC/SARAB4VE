/**
 * Servicio — lógica de negocio para el dominio de verificación.
 *
 * Incluye la máquina de estados para el flujo de verificación:
 *
 *   entregada    -> en_estudio
 *   en_estudio   -> aceptada | rechazada
 *   rechazada    -> entregada   (reenvío tras corrección)
 *   aceptada     -> (estado final)
 *
 * Todas las operaciones de escritura que involucran múltiples tablas
 * se ejecutan dentro de una transacción atómica.
 */
const { ALLOWED_TRANSITIONS } = require("./verification.schema");

// ---------------------------------------------------------------------------
// Máquina de estados (pura, sin dependencias externas)
// ---------------------------------------------------------------------------

/**
 * Mapa de transiciones permitidas.
 * Única fuente de verdad exportada para tests y reuso.
 */
const STATE_MACHINE = Object.freeze({
  entregada: Object.freeze(["en_estudio"]),
  en_estudio: Object.freeze(["aceptada", "rechazada"]),
  rechazada: Object.freeze(["entregada"]),
  aceptada: Object.freeze([]),
});

/**
 * Valida si una transición de estado es permitida.
 *
 * @param {string} fromStatus — Estado actual
 * @param {string} toStatus   — Estado deseado
 * @returns {{ valid: boolean, error?: string }}
 */
function validateTransition(fromStatus, toStatus) {
  const allowed = STATE_MACHINE[fromStatus];

  if (!allowed) {
    return {
      valid: false,
      error: `Estado actual "${fromStatus}" no reconocido`,
    };
  }

  if (!allowed.includes(toStatus)) {
    return {
      valid: false,
      error: `Transición de "${fromStatus}" a "${toStatus}" no permitida. Permitidas: ${allowed.join(", ") || "ninguna (estado final)"}`,
    };
  }

  return { valid: true };
}

/**
 * Determina si un estado es final (sin transiciones de salida).
 * @param {string} status
 * @returns {boolean}
 */
function isTerminalStatus(status) {
  const allowed = STATE_MACHINE[status];
  return allowed !== undefined && allowed.length === 0;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Determina si el error de PostgreSQL es una violación de unique constraint
 * o de foreign key, y extrae información útil.
 * @param {Error & { code?: string, constraint?: string, detail?: string }} error
 * @returns {{ isUniqueViolation: boolean, isForeignKeyViolation: boolean, field: string|null }}
 */
function parseDbError(error) {
  if (error.code === "23505") {
    const constraint = error.constraint || "";
    if (constraint.includes("pkey") || constraint.includes("primary")) {
      return { isUniqueViolation: true, isForeignKeyViolation: false, field: "perfil" };
    }
    if (constraint.includes("owner")) {
      return { isUniqueViolation: true, isForeignKeyViolation: false, field: "solicitud" };
    }
    return { isUniqueViolation: true, isForeignKeyViolation: false, field: "desconocido" };
  }
  if (error.code === "23503") {
    // foreign_key_violation — normalmente un catalog_id que no existe con ese type
    const constraint = error.constraint || error.detail || "";
    if (constraint.includes("disability_type")) {
      return { isUniqueViolation: false, isForeignKeyViolation: true, field: "disabilityTypeIds" };
    }
    if (constraint.includes("service")) {
      return { isUniqueViolation: false, isForeignKeyViolation: true, field: "serviceIds" };
    }
    if (constraint.includes("interest_area")) {
      return { isUniqueViolation: false, isForeignKeyViolation: true, field: "interestAreaIds" };
    }
    if (constraint.includes("experience")) {
      return { isUniqueViolation: false, isForeignKeyViolation: true, field: "experienceCategoryIds" };
    }
    if (constraint.includes("organization_type")) {
      return { isUniqueViolation: false, isForeignKeyViolation: true, field: "organizationTypeId" };
    }
    return { isUniqueViolation: false, isForeignKeyViolation: true, field: "catalogId" };
  }
  return { isUniqueViolation: false, isForeignKeyViolation: false, field: null };
}

// ---------------------------------------------------------------------------
// Registro de Organización
// ---------------------------------------------------------------------------

/**
 * Registra una organización: perfil, representantes, relaciones many-to-many
 * y solicitud de verificación.
 *
 * @param {import("./verification.types").OrganizationRegisterInput} payload — ya validado
 * @param {Object} schema — verification.schema (normalizadores)
 * @param {Object} repository — verification.repository
 * @returns {Promise<import("./verification.types").ServiceResult>}
 */
async function registerOrganization(payload, userId, schema, repository) {
  const normalized = schema.normalizeOrganizationRegister(payload, userId);

  try {
    const result = await repository.withTransaction(async (client) => {
      // 1. Insertar perfil
      const profile = await repository.insertOrganizationProfile(client, normalized.profile);

      // 2. Insertar representantes legales
      for (const rep of normalized.legalRepresentatives) {
        await repository.insertLegalRepresentative(client, userId, rep);
      }

      // 3. Relaciones many-to-many
      if (normalized.disabilityTypeIds.length > 0) {
        await repository.insertCatalogRelations(
          client, userId, "organization_disability_types", normalized.disabilityTypeIds,
        );
      }
      if (normalized.serviceIds.length > 0) {
        await repository.insertCatalogRelations(
          client, userId, "organization_services", normalized.serviceIds,
        );
      }

      // 4. Solicitud de verificación
      const verification = await repository.insertVerificationRequest(
        client, userId, "organization",
      );

      return { profile, verification };
    });

    return { data: result, status: 201 };
  } catch (error) {
    const { isUniqueViolation, isForeignKeyViolation, field } = parseDbError(error);
    if (isUniqueViolation) {
      return {
        errors: [`Ya existe un ${field} de verificación para este usuario`],
        status: 409,
      };
    }
    if (isForeignKeyViolation) {
      return {
        errors: [`Uno o más IDs en "${field}" no existen en el catálogo para el tipo esperado`],
        status: 400,
      };
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Registro de Voluntario
// ---------------------------------------------------------------------------

/**
 * Registra un voluntario (profesional o no profesional): perfil, relaciones
 * many-to-many y solicitud de verificación.
 *
 * @param {import("./verification.types").VolunteerRegisterInput} payload — ya validado
 * @param {Object} schema — verification.schema (normalizadores)
 * @param {Object} repository — verification.repository
 * @returns {Promise<import("./verification.types").ServiceResult>}
 */
async function registerVolunteer(payload, userId, schema, repository) {
  const normalized = schema.normalizeVolunteerRegister(payload, userId);

  try {
    const result = await repository.withTransaction(async (client) => {
      // 1. Insertar perfil
      const profile = await repository.insertVolunteerProfile(client, normalized.profile);

      // 2. Relaciones many-to-many
      if (normalized.interestAreaIds.length > 0) {
        await repository.insertCatalogRelations(
          client, userId, "volunteer_interest_areas", normalized.interestAreaIds,
        );
      }
      if (normalized.experienceCategoryIds.length > 0) {
        await repository.insertCatalogRelations(
          client, userId, "volunteer_experience", normalized.experienceCategoryIds,
        );
      }

      // 3. Solicitud de verificación
      const verification = await repository.insertVerificationRequest(
        client, userId, normalized.entityType,
      );

      return { profile, verification };
    });

    return { data: result, status: 201 };
  } catch (error) {
    const { isUniqueViolation, isForeignKeyViolation, field } = parseDbError(error);
    if (isUniqueViolation) {
      return {
        errors: [`Ya existe un ${field} de verificación para este usuario`],
        status: 409,
      };
    }
    if (isForeignKeyViolation) {
      return {
        errors: [`Uno o más IDs en "${field}" no existen en el catálogo para el tipo esperado`],
        status: 400,
      };
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Documentos de verificación
// ---------------------------------------------------------------------------

/**
 * Sube un documento de verificación a Cloudflare R2 (carpeta `documents_verifications/`)
 * y crea el registro en verification_documents.
 *
 * @param {import("./verification.types").DocumentUploadInput & { fileBuffer: Buffer }} payload
 * @param {string} ownerId
 * @param {Object} repository
 * @returns {Promise<import("./verification.types").ServiceResult>}
 */
async function uploadDocument(payload, ownerId, repository) {
  const { uploadDocument: uploadToR2 } = require("../../services/storage");

  try {
    // 1. Subir archivo a R2 → carpeta documents_verifications/<ownerId>/
    const { url: fileUrl, storageKey } = await uploadToR2(
      payload.fileBuffer,
      payload.fileName,
      payload.mimeType,
      ownerId,
    );

    // 2. Registrar en la base de datos
    const document = await repository.withTransaction(async (client) => {
      return repository.insertVerificationDocument(
        client, ownerId, payload.documentTypeId, fileUrl,
      );
    });

    return {
      data: {
        ...document,
        uploadUrl: fileUrl,
        storageKey,
      },
      status: 201,
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Obtiene el checklist de documentos requeridos con su estado actual.
 * Combina document_types (requeridos) con verification_documents (subidos).
 *
 * @param {string} ownerId
 * @param {string} entityType
 * @param {Object} repository
 * @returns {Promise<import("./verification.types").ServiceResult>}
 */
async function getDocumentChecklist(ownerId, entityType, repository) {
  const requiredDocs = await repository.findDocumentTypesByEntity(entityType);
  const submittedDocs = await repository.findDocumentsByOwner(ownerId);

  // Construir checklist: cada tipo de documento con su estado
  const checklist = requiredDocs.map((docType) => {
    const submitted = submittedDocs.find(
      (d) => d.documentTypeId === docType.id,
    );
    return {
      documentType: docType,
      submission: submitted || null,
      isComplete: submitted ? submitted.status !== "rejected" : false,
    };
  });

  return { data: checklist };
}

/**
 * Revisa un documento (solo admin).
 *
 * @param {number} documentId
 * @param {import("./verification.types").DocumentReviewInput} review
 * @param {string} reviewerId
 * @param {Object} repository
 * @returns {Promise<import("./verification.types").ServiceResult>}
 */
async function reviewDocument(documentId, review, reviewerId, repository) {
  const document = await repository.findDocumentById(documentId);

  if (!document) {
    return { errors: ["Documento no encontrado"], status: 404 };
  }

  const updated = await repository.updateDocumentStatus(
    documentId,
    review.status,
    review.reason || null,
    reviewerId,
  );

  return { data: updated };
}

// ---------------------------------------------------------------------------
// Transición de estado (admin)
// ---------------------------------------------------------------------------

/**
 * Transiciona una solicitud de verificación a un nuevo estado.
 * Aplica la máquina de estados y efectos secundarios:
 *   - aceptada -> activa la cuenta del usuario (status = 'approved')
 *
 * @param {number} verificationId
 * @param {import("./verification.types").TransitionInput} transition
 * @param {string} reviewerId — UUID del admin que realiza la transición
 * @param {Object} repository
 * @returns {Promise<import("./verification.types").ServiceResult>}
 */
async function transitionVerification(verificationId, transition, reviewerId, repository) {
  // 1. Buscar la solicitud actual
  const current = await repository.findVerificationById(verificationId);

  if (!current) {
    return { errors: ["Solicitud de verificación no encontrada"], status: 404 };
  }

  // 2. Validar transición contra la máquina de estados
  const validation = validateTransition(current.status, transition.toStatus);

  if (!validation.valid) {
    return { errors: [validation.error], status: 422 };
  }

  // 3. Ejecutar transición con efectos secundarios en una transacción
  try {
    const result = await repository.withTransaction(async (client) => {
      // Actualizar estado
      const updated = await repository.updateVerificationStatus(
        client, verificationId, transition.toStatus,
        transition.reason || null, reviewerId,
      );

      // Registrar historial
      await repository.insertStatusHistory(
        client, verificationId, current.status, transition.toStatus,
        reviewerId, transition.reason || null,
      );

      // Efecto secundario: si se acepta, activar la cuenta del usuario
      if (transition.toStatus === "aceptada") {
        await repository.approveUser(client, current.ownerId);
      }

      return updated;
    });

    // TODO: Disparar notificación al usuario (WhatsApp Cloud API / email)
    // cuando se implemente el servicio de notificaciones.

    return { data: result };
  } catch (error) {
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Consultas (catálogo, admin queue)
// ---------------------------------------------------------------------------

/**
 * Obtiene entradas del catálogo unificado por tipo.
 * @param {string} type — catalog_type
 * @param {Object} repository
 * @returns {Promise<import("./verification.types").ServiceResult>}
 */
async function getCatalog(type, repository) {
  const items = await repository.findCatalogByType(type);
  return { data: items };
}

/**
 * Obtiene la cola de verificaciones para administración.
 * @param {Object} filters — { status?, entityType? }
 * @param {Object} repository
 * @returns {Promise<import("./verification.types").ServiceResult>}
 */
async function listAdminVerifications(filters, repository) {
  const rows = await repository.listVerifications(
    filters.status || null,
    filters.entityType || null,
  );
  return { data: rows };
}

/**
 * Obtiene el estado de verificación de un usuario.
 * @param {string} ownerId
 * @param {Object} repository
 * @returns {Promise<import("./verification.types").ServiceResult>}
 */
async function getMyVerificationStatus(ownerId, repository) {
  const verification = await repository.findVerificationByOwner(ownerId);

  if (!verification) {
    return { errors: ["No tienes una solicitud de verificación activa"], status: 404 };
  }

  return { data: verification };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  // Máquina de estados (exportada para tests y reuso)
  STATE_MACHINE,
  validateTransition,
  isTerminalStatus,

  // Operaciones
  registerOrganization,
  registerVolunteer,
  uploadDocument,
  getDocumentChecklist,
  reviewDocument,
  transitionVerification,
  getCatalog,
  listAdminVerifications,
  getMyVerificationStatus,
};
