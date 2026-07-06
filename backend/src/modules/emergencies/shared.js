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

module.exports = {
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
};
