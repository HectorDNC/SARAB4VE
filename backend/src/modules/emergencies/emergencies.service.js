/**
 * Servicio — lógica de negocio para el dominio de emergencias.
 */
const db = require("../../db");

/**
 * Normaliza el payload de creación (camelCase → snake_case interno).
 * @param {Object} payload — cuerpo del request sin procesar
 * @returns {Object} payload listo para INSERT
 */
function normalizeCreateEmergency(payload) {
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
    latitude: Number(payload.latitude),
    longitude: Number(payload.longitude),
    urgency: payload.urgency || "high",
    needType: payload.needType,
    description: payload.description.trim(),
  };
}

/**
 * Inserta una nueva emergencia en la base de datos.
 * @param {Object} payload — ya validado
 * @returns {Promise<Object>} fila insertada
 */
async function createEmergency(payload) {
  const data = normalizeCreateEmergency(payload);

  const result = await db.query(
    `
      INSERT INTO emergencies (
        requester_name,
        is_injured,
        cannot_move,
        disability_type,
        communication_mode,
        disability_subcategory,
        extra_info,
        voice_note_url,
        voice_note_duration_sec,
        latitude,
        longitude,
        urgency,
        need_type,
        description
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id, requester_name, is_injured, cannot_move, disability_type,
                communication_mode, disability_subcategory, extra_info,
                voice_note_url, voice_note_duration_sec, latitude, longitude,
                urgency, need_type, description, status, assigned_at,
                resolved_at, created_at, updated_at
    `,
    [
      data.requesterName,
      data.isInjured,
      data.cannotMove,
      data.disabilityType,
      data.communicationMode,
      data.disabilitySubcategory,
      data.extraInfo,
      data.voiceNoteUrl,
      data.voiceNoteDurationSec,
      data.latitude,
      data.longitude,
      data.urgency,
      data.needType,
      data.description,
    ],
  );

  return result.rows[0];
}

/**
 * Lista emergencias usando los filtros ya validados.
 * @param {Object} filters — salida de validateSearchEmergencies().filters
 * @returns {Promise<Array>}
 */
async function listEmergencies(filters, repository) {
  const { sql, values } = repository.buildListEmergenciesQuery(filters);
  const result = await db.query(sql, values);
  return result.rows;
}

/**
 * Obtiene una emergencia por ID (detalle completo).
 * @param {string} id
 * @param {Object} repository
 * @returns {Promise<{ data: Object|null, status: number, errors?: string[] }>}
 */
async function getEmergencyById(id, repository) {
  const row = await repository.findEmergencyById(id, db);
  if (!row) {
    return { errors: ["emergency not found"], status: 404 };
  }
  return { data: row, status: 200 };
}

/**
 * Obtiene el estado de procesamiento de una emergencia.
 * @param {string} id
 * @param {Object} repository
 * @returns {Promise<{ data: Object|null, status: number, errors?: string[] }>}
 */
async function getProcessingStatus(id, repository) {
  const row = await repository.getProcessingStatus(id);
  if (!row) {
    return { errors: ["emergency not found"], status: 404 };
  }
  return { data: row, status: 200 };
}

module.exports = {
  normalizeCreateEmergency,
  createEmergency,
  listEmergencies,
  getEmergencyById,
  getProcessingStatus,
};
