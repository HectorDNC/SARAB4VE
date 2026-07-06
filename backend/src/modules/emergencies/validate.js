/**
 * Validación del payload de creación de emergencia (SOS).
 */
const {
  DISABILITY_TYPE_SET,
  COMMUNICATION_MODE_SET,
  DISABILITY_SUBCATEGORY_SET,
  URGENCY_LEVEL_SET,
} = require("./shared");
const { isBlank, isFiniteNumber } = require("../../lib/validation");

/**
 * @param {Object} payload — cuerpo del request sin procesar
 * @returns {{ isValid: boolean, errors: string[] }}
 */
function validateEmergency(payload) {
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

  // latitude — requerido
  if (
    !isFiniteNumber(payload.latitude) ||
    payload.latitude < -90 ||
    payload.latitude > 90
  ) {
    errors.push("latitude must be a valid coordinate");
  }

  // longitude — requerido
  if (
    !isFiniteNumber(payload.longitude) ||
    payload.longitude < -180 ||
    payload.longitude > 180
  ) {
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
    errors.push("voiceNoteDurationSec must be a positive number");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

module.exports = { validateEmergency };
