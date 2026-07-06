/**
 * Normalización del payload de creación de emergencia (SOS).
 * Convierte nombres camelCase del frontend a los nombres internos
 * que espera la base de datos.
 */

/**
 * @param {Object} payload — cuerpo del request sin procesar
 * @returns {Object} payload listo para INSERT
 */
function normalizeEmergency(payload) {
  return {
    requesterName: (payload.requesterName || "Persona en emergencia").trim(),
    isInjured: Boolean(payload.isInjured),
    cannotMove: Boolean(payload.cannotMove),
    disabilityType: payload.disabilityType,
    communicationMode: payload.communicationMode || null,
    disabilitySubcategory: payload.disabilitySubcategory || null,
    extraInfo: payload.extraInfo ? payload.extraInfo.trim() : null,
    voiceNoteUrl: payload.voiceNoteUrl || null,
    voiceNoteDurationSec: payload.voiceNoteDurationSec
      ? Number(payload.voiceNoteDurationSec)
      : null,
    latitude: payload.latitude,
    longitude: payload.longitude,
    urgency: payload.urgency || "high",
    needType: payload.needType,
    description: payload.description.trim(),
  };
}

module.exports = { normalizeEmergency };
