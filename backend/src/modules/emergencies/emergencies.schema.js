/**
 * Constantes del dominio de emergencias (SOS).
 * Las utilidades de validación reutilizables viven en src/lib/validation.js.
 */

const DISABILITY_TYPES = ["visual", "auditiva", "neuro", "motriz"];

const COMMUNICATION_MODES = [
  "lengua_senas",
  "audifono",
  "implante_coclear",
  "vibrador_oseo",
];

const DISABILITY_SUBCATEGORIES = [
  // visual
  "guia_voz",
  "braille",
  "perro_guia",
  // neuro
  "ambiente_calmado",
  "comunicacion_clara",
  "acompanamiento",
  // motriz
  "silla_ruedas",
  "traslado_asistido",
  "evacuacion_accesible",
];

const URGENCY_LEVELS = ["low", "medium", "high", "critical"];
const EMERGENCY_STATUSES = ["received", "assigned", "resolved"];

const DISABILITY_TYPE_SET = new Set(DISABILITY_TYPES);
const COMMUNICATION_MODE_SET = new Set(COMMUNICATION_MODES);
const DISABILITY_SUBCATEGORY_SET = new Set(DISABILITY_SUBCATEGORIES);
const URGENCY_LEVEL_SET = new Set(URGENCY_LEVELS);
const EMERGENCY_STATUS_SET = new Set(EMERGENCY_STATUSES);

// ---------------------------------------------------------------------------
// Validación de creación (POST)
// ---------------------------------------------------------------------------

const { isBlank, isFiniteNumber } = require("../../lib/validation");

/**
 * @param {Object} payload — cuerpo del request sin procesar
 * @returns {{ isValid: boolean, errors: string[] }}
 */
function validateCreateEmergency(payload) {
  const errors = [];

  // requesterName — opcional, tiene default en DB
  if (
    payload.requesterName !== undefined &&
    payload.requesterName !== null &&
    isBlank(payload.requesterName)
  ) {
    errors.push("requesterName must not be empty");
  }

  // disabilityType — requerido
  if (!DISABILITY_TYPE_SET.has(payload.disabilityType)) {
    errors.push(
      `disabilityType is required and must be one of: ${[...DISABILITY_TYPE_SET].join(", ")}`,
    );
  }

  // communicationMode — opcional, pero si viene debe ser válido
  if (
    payload.communicationMode &&
    !COMMUNICATION_MODE_SET.has(payload.communicationMode)
  ) {
    errors.push(
      `communicationMode must be one of: ${[...COMMUNICATION_MODE_SET].join(", ")}`,
    );
  }

  // disabilitySubcategory — opcional, pero si viene debe ser válido
  if (
    payload.disabilitySubcategory &&
    !DISABILITY_SUBCATEGORY_SET.has(payload.disabilitySubcategory)
  ) {
    errors.push(
      `disabilitySubcategory must be one of: ${[...DISABILITY_SUBCATEGORY_SET].join(", ")}`,
    );
  }

  // needType — requerido
  if (isBlank(payload.needType)) {
    errors.push("needType is required");
  }

  // description — requerido
  if (isBlank(payload.description)) {
    errors.push("description is required");
  }

  // latitude — requerido (acepta string numérico, ej: "10.03")
  const lat = toNumber(payload.latitude);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    errors.push("latitude must be a valid coordinate");
  }

  // longitude — requerido (acepta string numérico, ej: "-70.41")
  const lng = toNumber(payload.longitude);
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    errors.push("longitude must be a valid coordinate");
  }

  // urgency — opcional, con default "high"
  if (payload.urgency && !URGENCY_LEVEL_SET.has(payload.urgency)) {
    errors.push(`urgency must be one of: ${[...URGENCY_LEVEL_SET].join(", ")}`);
  }

  // voiceNoteDurationSec — opcional, si viene debe ser número positivo
  if (
    payload.voiceNoteDurationSec !== undefined &&
    payload.voiceNoteDurationSec !== null &&
    (!Number.isFinite(Number(payload.voiceNoteDurationSec)) ||
      Number(payload.voiceNoteDurationSec) <= 0)
  ) {
    payload.voiceNoteDurationSec = null;
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ---------------------------------------------------------------------------
// Validación de búsqueda (GET /)
// ---------------------------------------------------------------------------

const DEFAULT_RADIUS_KM = 10;
const MAX_RADIUS_KM = 100;
const { toNumber } = require("../../lib/validation");

/**
 * @param {Object} query — req.query sin procesar
 * @returns {{ isValid: boolean, errors: string[], filters: Object }}
 */
function validateSearchEmergencies(query) {
  const errors = [];
  const hasLatitude = query.latitude !== undefined;
  const hasLongitude = query.longitude !== undefined;
  const hasRadius = query.radiusKm !== undefined;
  const hasGeoFilter = hasLatitude || hasLongitude || hasRadius;

  if (query.status && !EMERGENCY_STATUS_SET.has(query.status)) {
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

module.exports = {
  // constantes
  DISABILITY_TYPES,
  COMMUNICATION_MODES,
  DISABILITY_SUBCATEGORIES,
  URGENCY_LEVELS,
  EMERGENCY_STATUSES,
  DISABILITY_TYPE_SET,
  COMMUNICATION_MODE_SET,
  DISABILITY_SUBCATEGORY_SET,
  URGENCY_LEVEL_SET,
  EMERGENCY_STATUS_SET,
  DEFAULT_RADIUS_KM,
  MAX_RADIUS_KM,
  // validación
  validateCreateEmergency,
  validateSearchEmergencies,
};
