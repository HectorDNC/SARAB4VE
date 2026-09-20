/**
 * Mapeo del `disability_type` de una emergencia (4 valores del formulario SOS,
 * minúsculas) a los nombres canónicos del catálogo `disability_type` que
 * declaran las organizaciones (11 valores, ver backend/sql/verification_schema.sql).
 *
 * ⚠️ REVISAR: `neuro` y `motriz` son categorías paraguas. Este mapeo es
 * deliberadamente AMPLIO: en una emergencia preferimos avisar de más antes
 * que dejar sin aviso a una organización relevante.
 */
const EMERGENCY_DISABILITY_TO_CATALOG = {
  visual: ["Visual"],
  auditiva: ["Auditiva"],
  neuro: [
    "Intelectual",
    "Psicosocial",
    "TEA",
    "Daño cerebral",
    "Enfermedades raras",
    "Multidiscapacidad",
  ],
  motriz: [
    "Física",
    "Discapacidad orgánica/visceral",
    "Multidiscapacidad",
  ],
};

/**
 * Resuelve los nombres de categoría del catálogo para el `disability_type` de
 * una emergencia. El valor se normaliza (trim + minúsculas) porque puede venir
 * del LLM con otra capitalización ("Visual" en lugar de "visual").
 *
 * Un valor desconocido (o vacío) devuelve `[]`, lo que en la consulta de
 * destinatarios equivale a "solo por radio". Nunca lanza.
 *
 * @param {string} emergencyDisabilityType
 * @returns {string[]}
 */
function resolveCatalogCategories(emergencyDisabilityType) {
  const key = String(emergencyDisabilityType || "").trim().toLowerCase();
  return EMERGENCY_DISABILITY_TO_CATALOG[key] || [];
}

module.exports = {
  EMERGENCY_DISABILITY_TO_CATALOG,
  resolveCatalogCategories,
};
