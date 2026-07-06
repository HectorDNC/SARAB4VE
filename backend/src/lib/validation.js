/**
 * Utilidades de validación compartidas entre todos los módulos del proyecto.
 */

/**
 * Retorna true si el valor es un string vacío o sólo espacios.
 * @param {*} value
 * @returns {boolean}
 */
function isBlank(value) {
  return typeof value !== "string" || value.trim() === "";
}

/**
 * Retorna true si el valor es un número finito.
 * @param {*} value
 * @returns {boolean}
 */
function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Intenta convertir un valor a número. Retorna NaN si no es posible.
 * @param {*} value
 * @returns {number}
 */
function toNumber(value) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value !== "string" || value.trim() === "") {
    return Number.NaN;
  }

  return Number(value);
}

/**
 * Retorna true si el valor es un UUID v4 válido.
 * @param {*} value
 * @returns {boolean}
 */
function isUuid(value) {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

module.exports = {
  isBlank,
  isFiniteNumber,
  isUuid,
  toNumber,
};
