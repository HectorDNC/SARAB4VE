/**
 * Servicio — lógica de negocio para el dominio de help-requests.
 */

/**
 * Crea un help-request.
 * @param {Object} payload — ya validado
 * @param {Object} schema
 * @param {Object} repository
 * @returns {Promise<Object>}
 */
async function createHelpRequest(payload, schema, repository) {
  const normalized = schema.normalizeCreateHelpRequest(payload);
  return repository.insertHelpRequest(normalized);
}

/**
 * Lista help-requests usando los filtros ya validados.
 * @param {Object} filters
 * @param {Object} repository
 * @returns {Promise<Array>}
 */
async function listHelpRequests(filters, repository) {
  const { sql, values } = repository.buildListHelpRequestsQuery(filters);
  // Necesitamos db aquí, así que lo importamos directamente
  const db = require("../../db");
  const result = await db.query(sql, values);
  return result.rows;
}

/**
 * Acepta un help-request (un voluntario lo toma).
 * @param {string} id
 * @param {Object} payload — ya validado
 * @param {Object} schema
 * @param {Object} repository
 * @returns {Promise<{ data: Object|null, status: number, errors?: string[] }>}
 */
async function acceptHelpRequest(id, payload, schema, repository) {
  const normalized = schema.normalizeAcceptHelpRequest(payload);

  const updated = await repository.acceptHelpRequestById(id, normalized);
  if (updated) {
    return { data: updated, status: 200 };
  }

  const existing = await repository.findHelpRequestStatusById(id);
  if (!existing) {
    return { errors: ["help request not found"], status: 404 };
  }

  return { errors: ["help request is not open"], status: 409 };
}

/**
 * Resuelve un help-request.
 * @param {string} id
 * @param {Object} repository
 * @returns {Promise<{ data: Object|null, status: number, errors?: string[] }>}
 */
async function resolveHelpRequest(id, repository) {
  const updated = await repository.resolveHelpRequestById(id);
  if (updated) {
    return { data: updated, status: 200 };
  }

  const existing = await repository.findHelpRequestStatusById(id);
  if (!existing) {
    return { errors: ["help request not found"], status: 404 };
  }

  return { errors: ["help request is not assigned"], status: 409 };
}

module.exports = {
  createHelpRequest,
  listHelpRequests,
  acceptHelpRequest,
  resolveHelpRequest,
};
