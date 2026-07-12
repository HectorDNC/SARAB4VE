/**
 * Esquema — constantes, validación y normalización para el dominio de help-requests.
 */
const { isBlank, isFiniteNumber, isUuid, toNumber } = require("../../lib/validation");

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const NEED_TYPES = [
  "equipment",
  "medication",
  "transport",
  "companionship",
  "interpreter",
  "accessible_information",
  "neurodivergent_support",
  "psychosocial_support",
];

const URGENCY_LEVELS = ["low", "medium", "high", "critical"];
const REQUEST_STATUSES = ["open", "assigned", "resolved"];
const DEFAULT_RADIUS_KM = 10;
const MAX_RADIUS_KM = 100;

const NEED_TYPE_SET = new Set(NEED_TYPES);
const URGENCY_LEVEL_SET = new Set(URGENCY_LEVELS);
const REQUEST_STATUS_SET = new Set(REQUEST_STATUSES);

// ---------------------------------------------------------------------------
// Normalización — creación
// ---------------------------------------------------------------------------

/**
 * @param {Object} payload
 * @returns {Object}
 */
function normalizeCreateHelpRequest(payload) {
  const hasLat = payload.latitude != null && payload.latitude !== "";
  const hasLng = payload.longitude != null && payload.longitude !== "";

  return {
    requesterName: payload.requesterName.trim(),
    contactMethod: payload.contactMethod.trim(),
    contactValue: payload.contactValue.trim(),
    needType: payload.needType,
    description: payload.description.trim(),
    latitude: hasLat && hasLng ? Number(payload.latitude) : null,
    longitude: hasLat && hasLng ? Number(payload.longitude) : null,
    urgency: payload.urgency || "medium",
  };
}

// ---------------------------------------------------------------------------
// Validación — creación
// ---------------------------------------------------------------------------

/**
 * @param {Object} payload
 * @returns {{ isValid: boolean, errors: string[] }}
 */
function validateCreateHelpRequest(payload) {
  const errors = [];

  if (isBlank(payload.requesterName)) {
    errors.push("requesterName is required");
  }

  if (isBlank(payload.contactMethod)) {
    errors.push("contactMethod is required");
  }

  if (isBlank(payload.contactValue)) {
    errors.push("contactValue is required");
  }

  if (!NEED_TYPE_SET.has(payload.needType)) {
    errors.push("needType is invalid");
  }

  if (isBlank(payload.description)) {
    errors.push("description is required");
  }

  // latitude — opcional (acepta string numérico, ej: "10.03")
  const hasLat = payload.latitude != null && payload.latitude !== "";
  const hasLng = payload.longitude != null && payload.longitude !== "";

  if (hasLat) {
    const lat = toNumber(payload.latitude);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      errors.push("latitude must be a valid coordinate");
    }
  }

  // longitude — opcional (acepta string numérico, ej: "-70.41")
  if (hasLng) {
    const lng = toNumber(payload.longitude);
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      errors.push("longitude must be a valid coordinate");
    }
  }

  // Si se proporciona una coordenada, la otra también debe venir
  if (hasLat !== hasLng) {
    errors.push("latitude and longitude must be provided together");
  }

  if (payload.urgency && !URGENCY_LEVEL_SET.has(payload.urgency)) {
    errors.push("urgency is invalid");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ---------------------------------------------------------------------------
// Validación — búsqueda
// ---------------------------------------------------------------------------

/**
 * @param {Object} query — req.query sin procesar
 * @returns {{ isValid: boolean, errors: string[], filters: Object }}
 */
function validateSearchHelpRequests(query) {
  const errors = [];
  const hasLatitude = query.latitude !== undefined;
  const hasLongitude = query.longitude !== undefined;
  const hasRadius = query.radiusKm !== undefined;
  const hasGeoFilter = hasLatitude || hasLongitude || hasRadius;

  if (query.status && !REQUEST_STATUS_SET.has(query.status)) {
    errors.push("status is invalid");
  }

  if (!hasGeoFilter) {
    return {
      isValid: errors.length === 0,
      errors,
      filters: {
        hasGeoFilter: false,
        latitude: null,
        longitude: null,
        radiusKm: null,
        status: query.status || null,
      },
    };
  }

  if (!hasLatitude || !hasLongitude) {
    errors.push("latitude and longitude are required together");
  }

  const latitude = hasLatitude ? toNumber(query.latitude) : null;
  const longitude = hasLongitude ? toNumber(query.longitude) : null;
  const radiusKm = hasRadius ? toNumber(query.radiusKm) : DEFAULT_RADIUS_KM;

  if (hasLatitude && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)) {
    errors.push("latitude must be a valid coordinate");
  }

  if (hasLongitude && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180)) {
    errors.push("longitude must be a valid coordinate");
  }

  if (!Number.isFinite(radiusKm) || radiusKm <= 0 || radiusKm > MAX_RADIUS_KM) {
    errors.push(`radiusKm must be between 0 and ${MAX_RADIUS_KM}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    filters: {
      hasGeoFilter: true,
      latitude,
      longitude,
      radiusKm,
      status: query.status || null,
    },
  };
}

// ---------------------------------------------------------------------------
// Normalización — aceptación
// ---------------------------------------------------------------------------

/**
 * @param {Object} payload
 * @returns {Object}
 */
function normalizeAcceptHelpRequest(payload) {
  return {
    volunteerName: payload.volunteerName.trim(),
    volunteerContactMethod: payload.volunteerContactMethod.trim(),
    volunteerContactValue: payload.volunteerContactValue.trim(),
  };
}

// ---------------------------------------------------------------------------
// Validación — aceptación
// ---------------------------------------------------------------------------

/**
 * @param {Object} payload
 * @returns {{ isValid: boolean, errors: string[] }}
 */
function validateAcceptHelpRequest(payload) {
  const errors = [];

  if (isBlank(payload.volunteerName)) {
    errors.push("volunteerName is required");
  }

  if (isBlank(payload.volunteerContactMethod)) {
    errors.push("volunteerContactMethod is required");
  }

  if (isBlank(payload.volunteerContactValue)) {
    errors.push("volunteerContactValue is required");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

module.exports = {
  // constantes
  NEED_TYPES,
  URGENCY_LEVELS,
  REQUEST_STATUSES,
  DEFAULT_RADIUS_KM,
  MAX_RADIUS_KM,
  NEED_TYPE_SET,
  URGENCY_LEVEL_SET,
  REQUEST_STATUS_SET,
  // utilidades re-exportadas
  isBlank,
  isFiniteNumber,
  isUuid,
  toNumber,
  // normalización
  normalizeCreateHelpRequest,
  normalizeAcceptHelpRequest,
  // validación
  validateCreateHelpRequest,
  validateSearchHelpRequests,
  validateAcceptHelpRequest,
};
