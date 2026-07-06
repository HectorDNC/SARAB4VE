/**
 * Operaciones de base de datos para el dominio de emergencias (SOS).
 */
const db = require("../db");
const { normalizeEmergency } = require("./normalize");

/**
 * Inserta una nueva emergencia en la base de datos.
 * @param {Object} payload — ya validado
 * @returns {Promise<Object>} fila insertada
 */
async function createEmergency(payload) {
  const data = normalizeEmergency(payload);

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

module.exports = { createEmergency };
