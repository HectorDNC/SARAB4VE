/**
 * Procesador asíncrono de emergencias por voz.
 *
 * Este módulo maneja el procesamiento en background de:
 * - Transcripción de audio (Gemini → fallback diccionario)
 * - Extracción de datos estructurados (Gemini → fallback diccionario)
 * - Actualización del estado de la emergencia en BD
 * - Notificaciones WebSocket al frontend
 *
 * La emergencia NUNCA se pierde: si todo falla, queda marcada para
 * revisión manual con los datos mínimos (ubicación + audio).
 */

const db = require('../../db');
const { notifyEmergencyUpdate } = require('../../services/websocket');
const { obtenerTranscript } = require('./transcriptorEmergencia');
const { extraerInformacionEmergencia } = require('./extractorEmergencia');
const { uploadAudio } = require('../../services/storage');

// ---------------------------------------------------------------------------
// Constantes del dominio
// ---------------------------------------------------------------------------

const DISABILITY_TYPES = ['visual', 'auditiva', 'neuro', 'motriz'];

/**
 * Indica si el JSON crudo devuelto por Gemini trae información útil.
 * @param {Object|null} infoGemini
 * @returns {boolean}
 */
function infoGeminiEsUtil(infoGemini) {
  if (!infoGemini || typeof infoGemini !== 'object') return false;
  if (infoGemini.tipo) return true;
  if (infoGemini.severidad) return true;
  if (infoGemini.disabilityType) return true;
  if (infoGemini.name) return true;
  if (typeof infoGemini.transcripcion === 'string' && infoGemini.transcripcion.trim().length > 0) {
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Notificación al frontend
// ---------------------------------------------------------------------------

/**
 * Notifica al frontend vía WebSocket el cambio de estado de una emergencia.
 *
 * Es BEST-EFFORT: cualquier error del WebSocket (servidor no inicializado,
 * fallo de serialización, cliente con estado inválido, etc.) se registra en
 * consola pero NUNCA interrumpe el procesamiento de la emergencia. La
 * emergencia siempre termina su pipeline y queda persistida en BD; si el WS
 * falla, el frontend puede hacer polling de /processing-status como fallback.
 *
 * @param {string} emergencyId
 * @param {Object} update — campos del update parcial
 */
function notify(emergencyId, update) {
  try {
    notifyEmergencyUpdate(emergencyId, update);
  } catch (err) {
    console.error(
      `[PROCESSOR] WebSocket notify falló para emergencia ${emergencyId} (continuando):`,
      err?.message || err
    );
  }
}

// ---------------------------------------------------------------------------
// Helpers de actualización en BD
// ---------------------------------------------------------------------------

/**
 * Actualiza el estado de la emergencia en la tabla.
 * status usa los valores del esquema: 'received', 'assigned', 'resolved'
 * processing_status es la columna nueva: 'recibida' | 'procesando' | 'completa' | 'pendiente_revision' | 'error'
 */
async function updateProcessingStatus(emergencyId, processingStatus) {
  await db.query(
    'UPDATE emergencies SET processing_status = $1, updated_at = NOW() WHERE id = $2',
    [processingStatus, emergencyId]
  );
}

async function updateEmergencyFields(emergencyId, fields) {
  const keys = Object.keys(fields);
  if (keys.length === 0) return;

  const setClauses = keys.map((key, i) => `${key} = $${i + 1}`);
  setClauses.push('updated_at = NOW()');
  const values = keys.map(k => fields[k]);
  values.push(emergencyId);

  const query = `UPDATE emergencies SET ${setClauses.join(', ')} WHERE id = $${values.length}`;
  await db.query(query, values);
}

// ---------------------------------------------------------------------------
// Construcción del UPDATE con datos extraídos
// ---------------------------------------------------------------------------

function buildExtractedFields(payload, infoExtraida, transcript) {
  const fields = {};

  // requesterName
  const requesterName =
    payload.requesterName && payload.requesterName !== 'Persona en emergencia'
      ? payload.requesterName.trim()
      : (infoExtraida?.name || payload.requesterName || 'Persona en emergencia').trim();
  fields.requester_name = requesterName;

  // is_injured / cannot_move
  fields.is_injured =
    payload.isInjured === true || payload.isInjured === 'true' || infoExtraida?.isInjured || false;
  fields.cannot_move =
    payload.cannotMove === true || payload.cannotMove === 'true' || infoExtraida?.cannotMove || false;

  // disability_type
  const disabilityType =
    payload.disabilityType && DISABILITY_TYPES.includes(payload.disabilityType)
      ? payload.disabilityType
      : (infoExtraida?.disabilityType || 'motriz');
  fields.disability_type = disabilityType;

  // communication_mode / disability_subcategory
  fields.communication_mode =
    payload.communicationMode?.trim() || infoExtraida?.communicationMode || null;
  fields.disability_subcategory =
    payload.disabilitySubcategory?.trim() || infoExtraida?.disabilitySubcategory || null;

  // description
  fields.description =
    payload.description &&
    payload.description.trim() &&
    payload.description !== payload.transcript
      ? payload.description.trim()
      : (infoExtraida?.resumen || transcript || 'Emergencia reportada por voz');

  // need_type
  fields.need_type = payload.tipo_emergencia?.trim()
    ? payload.tipo_emergencia.trim()
    : (infoExtraida?.tipo ||
       payload.needType?.trim() ||
       (transcript ? transcript.slice(0, 50) : 'Emergencia'));

  // urgency
  let urgency = payload.urgency;
  if ((!urgency || urgency === 'high') && infoExtraida?.severidad) {
    urgency =
      infoExtraida.severidad === 'alta' ? 'critical' :
      infoExtraida.severidad === 'media' ? 'high' :
      'medium';
  }
  fields.urgency = urgency || 'high';

  // extra_info
  fields.extra_info = payload.extraInfo?.trim() || null;

  // voice_note_duration_sec
  fields.voice_note_duration_sec = payload.voiceNoteDurationSec
    ? Number(payload.voiceNoteDurationSec)
    : null;

  return fields;
}

// ---------------------------------------------------------------------------
// Procesador principal
// ---------------------------------------------------------------------------

/**
 * Procesa una emergencia por voz de forma asíncrona.
 *
 * @param {string} emergencyId — UUID de la emergencia ya insertada
 * @param {Object} payload — datos validados del form-data (Zod output)
 * @param {Buffer|null} audioBuffer — buffer del audio (si existe)
 * @param {string} audioMimetype — MIME type del audio
 */
async function processVoiceEmergency(emergencyId, payload, audioBuffer, audioMimetype) {
  console.log(`[PROCESSOR] Iniciando procesamiento asíncrono de emergencia ${emergencyId}`);

  try {
    // ── Step 1: Marcar como 'procesando' ──
    await updateProcessingStatus(emergencyId, 'procesando');
    notify(emergencyId, {
      processingStatus: 'procesando',
      message: 'Procesamiento en curso'
    });

    // ── Step 2: Subir audio a R2 ──
    if (audioBuffer && audioBuffer.length > 0) {
      try {
        const audioUrl = await uploadAudio(
          audioBuffer,
          `${emergencyId}.webm`,
          audioMimetype || 'audio/webm'
        );
        await updateEmergencyFields(emergencyId, { voice_note_url: audioUrl });
        notify(emergencyId, {
          processingStatus: 'procesando',
          step: 'audio_uploaded',
          audioUrl
        });
        console.log(`[PROCESSOR] Audio subido: ${audioUrl}`);
      } catch (err) {
        console.error(`[PROCESSOR] Error subiendo audio:`, err.message);
        // No fatal: continuamos sin URL de audio
      }
    }

    // ── Step 3: Transcripción ──
    let transcript = payload.transcript ? payload.transcript.trim() : '';
    let metodoTranscripcion = transcript ? 'cliente-webspeech' : 'ninguno';
    let infoExtraidaDeGemini = null;

    if (!transcript && audioBuffer && audioBuffer.length > 0) {
      console.log('[PROCESSOR] Sin transcript del cliente, transcribiendo con backend…');
      notify(emergencyId, {
        processingStatus: 'procesando',
        step: 'transcribing'
      });

      try {
        const result = await obtenerTranscript(audioBuffer, audioMimetype || 'audio/webm');
        transcript = result.transcript || '';
        metodoTranscripcion = result.metodoTranscripcion;
        infoExtraidaDeGemini = result.rawInfo || null;

        if (transcript) {
          await updateEmergencyFields(emergencyId, {
            transcript: transcript,
            transcript_method: metodoTranscripcion
          });
          notify(emergencyId, {
            processingStatus: 'procesando',
            step: 'transcribed',
            transcript,
            transcriptMethod: metodoTranscripcion
          });
          console.log(`[PROCESSOR] Transcripción obtenida (${metodoTranscripcion}): "${transcript.substring(0, 60)}..."`);
        } else {
          console.warn('[PROCESSOR] No se pudo obtener transcripción');
        }
      } catch (err) {
        console.error('[PROCESSOR] Error en transcripción:', err.message);
      }
    }

    // ── Step 4: Extracción de datos ──
    let infoExtraida = null;

    if (infoExtraidaDeGemini && infoGeminiEsUtil(infoExtraidaDeGemini)) {
      console.log('[PROCESSOR] Reutilizando info extraída por Gemini (saltando cascada)');
      infoExtraida = infoExtraidaDeGemini;
    } else {
      const textoParaClasificar =
        transcript ||
        (payload.description && payload.description !== payload.transcript ? payload.description : '') ||
        payload.needType || '';

      if (textoParaClasificar) {
        notify(emergencyId, {
          processingStatus: 'procesando',
          step: 'extracting'
        });

        try {
          infoExtraida = await extraerInformacionEmergencia(textoParaClasificar);
          console.log('[PROCESSOR] Datos extraídos:', infoExtraida?.tipo, infoExtraida?.severidad);
        } catch (err) {
          console.error('[PROCESSOR] Error extrayendo información:', err.message);
        }
      } else {
        console.warn('[PROCESSOR] Sin texto disponible para clasificación');
      }
    }

    // ── Step 5: Actualizar emergencia con datos extraídos ──
    const extractedFields = buildExtractedFields(payload, infoExtraida, transcript);
    await updateEmergencyFields(emergencyId, extractedFields);

    notify(emergencyId, {
      processingStatus: 'procesando',
      step: 'data_extracted',
      infoEmergencia: infoExtraida
    });

    // ── Step 6: Determinar estado final ──
    const tieneDatosUtiles =
      (transcript && transcript.length > 0) ||
      (infoExtraida && (infoExtraida.tipo || infoExtraida.resumen || infoExtraida.severidad));

    const finalStatus = tieneDatosUtiles ? 'completa' : 'pendiente_revision';

    await updateProcessingStatus(emergencyId, finalStatus);

    notify(emergencyId, {
      processingStatus: finalStatus,
      step: 'completed',
      infoEmergencia: infoExtraida,
      transcript,
      transcriptMethod: metodoTranscripcion
    });

    console.log(`[PROCESSOR] Procesamiento completado. Estado: ${finalStatus}`);

  } catch (error) {
    console.error(`[PROCESSOR] Error crítico procesando emergencia ${emergencyId}:`, error);

    try {
      await updateProcessingStatus(emergencyId, 'pendiente_revision');
      notify(emergencyId, {
        processingStatus: 'pendiente_revision',
        error: 'Error en el procesamiento automático. La emergencia será revisada manualmente.'
      });
    } catch (dbErr) {
      console.error('[PROCESSOR] Error actualizando estado final:', dbErr.message);
    }
  }
}

module.exports = {
  processVoiceEmergency
};
