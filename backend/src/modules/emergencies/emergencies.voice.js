/**
 * Endpoint POST /api/emergencies/voice — reporte de emergencia por voz.
 *
 * FLUJO ASÍNCRONO:
 *   1. Inserta la emergencia INMEDIATAMENTE con estado 'recibida' y responde.
 *   2. El procesamiento pesado (transcripción/extracción) corre en background.
 *   3. El frontend recibe actualizaciones en tiempo real vía WebSocket.
 *
 * Schemas Zod (EmergenciaVozSchema) para validación + documentación OpenAPI.
 */

const { z } = require("zod");
const { extendZodWithOpenApi } = require("@asteasolutions/zod-to-openapi");
const multer = require("multer");

extendZodWithOpenApi(z);

// ---------------------------------------------------------------------------
// Constantes del dominio
// ---------------------------------------------------------------------------

const DISABILITY_TYPES = ["visual", "auditiva", "neuro", "motriz"];
const COMMUNICATION_MODES = [
  "lengua_senas",
  "audifono",
  "implante_coclear",
  "vibrador_oseo",
];
const URGENCY_LEVELS = ["low", "medium", "high", "critical"];

// ---------------------------------------------------------------------------
// Schema Zod para validación del body (multipart/form-data)
// ---------------------------------------------------------------------------

/**
 * Schema para POST /api/emergencies/voice.
 *
 * Todos los campos se reciben como strings (multipart/form-data).
 * Zod se encarga de coercer tipos y validar.
 */
const EmergenciaVozSchema = z.object({
  // ── Campos de voz ──
  transcript: z
    .string()
    .optional()
    .openapi({
      example: "Hay una persona atrapada necesito ayuda urgente",
      description: "Texto transcrito del audio enviado por el usuario",
    }),

  tipo_emergencia: z
    .string()
    .optional()
    .default("")
    .openapi({
      example: "Evacuación de emergencia",
      description: "Tipo de emergencia detectado en la voz (puede ser vacío si no se detectó)",
    }),

  // ── Fields del formulario estándar (opcionales o con defaults) ──

  requesterName: z
    .string()
    .optional()
    .default("Persona en emergencia")
    .openapi({
      example: "Persona anónima",
      description: "Nombre de quien reporta (opcional, default: 'Persona en emergencia')",
    }),

  disabilityType: z
    .preprocess(
      // multipart/form-data envía "" cuando el campo está vacío; convertirlo a undefined
      (val) => (val === "" || val === undefined || val === null ? undefined : val),
      z
        .enum(DISABILITY_TYPES, {
          errorMap: () => ({
            message: `disabilityType debe ser uno de: ${DISABILITY_TYPES.join(", ")}`,
          }),
        })
        .optional()
        .default("motriz"),
    )
    .openapi({
      example: "motriz",
      description: "Tipo de discapacidad (opcional; si no se envía, se infiere del transcript)",
    }),

  communicationMode: z
    .string()
    .optional()
    .nullable()
    .transform((val) => {
      if (!val || val.trim() === "") return null;
      return COMMUNICATION_MODES.includes(val) ? val : null;
    })
    .openapi({
      example: "lengua_senas",
      description: "Modo de comunicación preferido",
    }),

  disabilitySubcategory: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (!val || val.trim() === "" ? null : val.trim()))
    .openapi({
      example: "silla_ruedas",
      description: "Subcategoría de discapacidad",
    }),

  needType: z
    .string()
    .optional()
    .default("")
    .openapi({
      example: "Evacuación de emergencia",
      description: "Tipo de necesidad (opcional; si no se envía, se deriva de tipo_emergencia o transcript)",
    }),

  description: z
    .string()
    .optional()
    .default("")
    .openapi({
      example: "Persona reporta por voz que necesita asistencia urgente",
      description: "Descripción (opcional; si no se envía, se usa el transcript)",
    }),

  latitude: z
    .string()
    .refine(
      (val) => {
        const n = Number(val);
        return !Number.isNaN(n) && n >= -90 && n <= 90;
      },
      { message: "latitude debe ser una coordenada válida (-90 a 90)" },
    )
    .openapi({
      example: "10.4806",
      description: "Latitud en grados decimales (string numérico, form-data)",
    }),

  longitude: z
    .string()
    .refine(
      (val) => {
        const n = Number(val);
        return !Number.isNaN(n) && n >= -180 && n <= 180;
      },
      { message: "longitude debe ser una coordenada válida (-180 a 180)" },
    )
    .openapi({
      example: "-66.9036",
      description: "Longitud en grados decimales (string numérico, form-data)",
    }),

  urgency: z
    .enum(URGENCY_LEVELS)
    .optional()
    .default("high")
    .openapi({
      example: "high",
      description: "Nivel de urgencia (default: 'high')",
    }),

  isInjured: z
    .string()
    .optional()
    .transform((val) => val === "true" || val === "1")
    .openapi({
      example: "false",
      description: "¿La persona está herida? ('true'/'false')",
    }),

  cannotMove: z
    .string()
    .optional()
    .transform((val) => val === "true" || val === "1")
    .openapi({
      example: "false",
      description: "¿La persona no puede moverse? ('true'/'false')",
    }),

  extraInfo: z
    .string()
    .optional()
    .nullable()
    .openapi({
      example: "Edificio sin ascensor, 2do piso",
      description: "Información adicional relevante",
    }),

  voiceNoteDurationSec: z
    .string()
    .optional()
    .nullable()
    .transform((val) => {
      if (!val) return null;
      const n = Number(val);
      return Number.isFinite(n) && n > 0 ? n : null;
    })
    .openapi({
      example: "15",
      description: "Duración del audio en segundos (opcional)",
    }),
}).openapi({
  description: [
    "Payload multipart/form-data para reportar una emergencia por voz.",
    "El campo 'audio' debe enviarse como archivo binario en el form-data.",
    "Todos los demás campos son strings.",
  ].join(" "),
});

// ---------------------------------------------------------------------------
// Servicio — lógica de negocio (INSERT inmediato + procesamiento asíncrono)
// ---------------------------------------------------------------------------

const db = require("../../db");
const { processVoiceEmergency } = require("./emergencies.processor");

/**
 * Inserta una emergencia por voz en la base de datos de forma INMEDIATA.
 * El procesamiento pesado (transcripción/extracción) se lanza en background.
 *
 * @param {Object} payload — cuerpo validado del request (campos en camelCase)
 * @param {Object|null} audioFile — archivo de audio subido por multer, o null
 * @returns {Promise<Object>} fila insertada con processing_status='recibida'
 */
async function createEmergencyFromVoice(payload, audioFile) {
  // ── Preparar datos mínimos para INSERT inmediato ──
  // Solo lo esencial: ubicación, datos del formulario, estado inicial
  const requesterName = (payload.requesterName || "Persona en emergencia").trim();
  const isInjured = payload.isInjured === true || payload.isInjured === "true";
  const cannotMove = payload.cannotMove === true || payload.cannotMove === "true";
  const disabilityType =
    payload.disabilityType && DISABILITY_TYPES.includes(payload.disabilityType)
      ? payload.disabilityType
      : "motriz";
  const communicationMode = payload.communicationMode?.trim() || null;
  const disabilitySubcategory = payload.disabilitySubcategory?.trim() || null;
  const extraInfo = payload.extraInfo?.trim() || null;
  const voiceNoteDurationSec = payload.voiceNoteDurationSec
    ? Number(payload.voiceNoteDurationSec)
    : null;

  const latitude = Number(payload.latitude);
  const longitude = Number(payload.longitude);
  const urgency = payload.urgency || "high";

  // Datos temporales (se actualizarán en el procesamiento asíncrono)
  const needType = payload.tipo_emergencia?.trim() || payload.needType?.trim() || "Emergencia por voz";
  const description = payload.description?.trim() || "Emergencia reportada por voz (procesando...)";
  const transcript = payload.transcript?.trim() || null;
  const transcriptMethod = transcript ? "cliente-webspeech" : null;

  // ── INSERT inmediato ──
  const result = await db.query(
    `INSERT INTO emergencies (
        requester_name, is_injured, cannot_move, disability_type,
        communication_mode, disability_subcategory, extra_info,
        voice_note_duration_sec,
        latitude, longitude, urgency, need_type, description,
        report_origin, transcript, transcript_method,
        processing_status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING
        id, requester_name AS "requesterName", is_injured AS "isInjured",
        cannot_move AS "cannotMove", disability_type AS "disabilityType",
        communication_mode AS "communicationMode",
        disability_subcategory AS "disabilitySubcategory",
        extra_info AS "extraInfo", voice_note_url AS "voiceNoteUrl",
        voice_note_duration_sec AS "voiceNoteDurationSec",
        latitude, longitude, urgency, need_type AS "needType",
        description, status,
        report_origin AS "reportOrigin",
        transcript,
        transcript_method AS "transcriptMethod",
        processing_status AS "processingStatus",
        assigned_at AS "assignedAt", resolved_at AS "resolvedAt",
        created_at AS "createdAt", updated_at AS "updatedAt"
    `,
    [
      requesterName,
      isInjured,
      cannotMove,
      disabilityType,
      communicationMode,
      disabilitySubcategory,
      extraInfo,
      voiceNoteDurationSec,
      latitude,
      longitude,
      urgency,
      needType,
      description,
      "voz", // report_origin
      transcript,
      transcriptMethod,
      "recibida", // processing_status
    ],
  );

  const emergency = result.rows[0];

  // ── Lanzar procesamiento asíncrono en background ──
  // IMPORTANTE: No esperar la promesa. El procesamiento corre en background.
  const audioBuffer = audioFile?.buffer || null;
  const audioMimetype = audioFile?.mimetype || "audio/webm";

  console.log(`[voice] Emergencia ${emergency.id} creada. Lanzando procesamiento asíncrono...`);

  // Fire-and-forget: procesar en background sin bloquear la respuesta
  setImmediate(async () => {
    try {
      await processVoiceEmergency(emergency.id, payload, audioBuffer, audioMimetype);
    } catch (error) {
      console.error(`[voice] Error crítico en procesamiento asíncrono de emergencia ${emergency.id}:`, error);
    }
  });

  return emergency;
}

// ---------------------------------------------------------------------------
// Controlador — handler HTTP
// ---------------------------------------------------------------------------

/**
 * POST /api/emergencies/voice
 *
 * Requiere autenticación (cualquier rol autenticado).
 * Acepta multipart/form-data con archivo de audio + campos.
 *
 * RESPONDE INMEDIATAMENTE con la emergencia creada (processing_status='recibida').
 * El procesamiento continúa en background y el frontend recibe actualizaciones vía WebSocket.
 */
function createEmergencyVoiceHandler(schema) {
  return async (req, res, next) => {
    // ── Validar campos del form-data con Zod ──
    const parsed = schema.safeParse(req.body);

    if (!parsed.success) {
      const errors = parsed.error.issues.map(
        (issue) => `${issue.path.join(".")}: ${issue.message}`,
      );
      return res.status(400).json({ errors });
    }

    try {
      // req.file viene de multer (puede ser undefined si no se envió audio)
      const audioFile = req.file || null;

      // INSERT inmediato + procesamiento asíncrono en background
      const emergency = await createEmergencyFromVoice(parsed.data, audioFile);

      // Responder INMEDIATAMENTE al cliente
      return res.status(201).json({
        data: emergency,
        message: "Emergencia registrada. Procesamiento en curso. Suscríbete a WebSocket para actualizaciones.",
        wsEndpoint: `/ws?emergencyId=${emergency.id}`
      });
    } catch (error) {
      return next(error);
    }
  };
}

// ---------------------------------------------------------------------------
// Multer — middleware para parsear multipart/form-data con archivo de audio
// ---------------------------------------------------------------------------

/**
 * Middleware de multer configurado para recibir el archivo de audio en memoria.
 * Campo esperado: "audio".
 * Tamaño máximo: 10 MB.
 */
const _upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
  fileFilter: (_req, file, cb) => {
    // Aceptar solo formatos de audio comunes
    const allowedMimes = [
      "audio/webm",
      "audio/mp4",
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/ogg",
      "audio/x-m4a",
      "audio/aac",
      "audio/flac",
    ];
    if (allowedMimes.includes(file.mimetype) || file.mimetype.startsWith("audio/")) {
      cb(null, true);
    } else {
      cb(new Error(`Formato de audio no soportado: ${file.mimetype}`), false);
    }
  },
}).single("audio");

/**
 * Wrapper de multer que captura errores de subida (archivo muy grande,
 * formato inválido, etc.) y responde con 400 en lugar de 500.
 */
function handleMulterUpload(req, res, next) {
  _upload(req, res, (err) => {
    if (err) {
      // Error de multer: archivo muy grande, formato inválido, etc.
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          errors: ["El archivo de audio excede el tamaño máximo permitido (10 MB)"],
        });
      }
      return res.status(400).json({ errors: [err.message] });
    }
    next();
  });
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  EmergenciaVozSchema,
  createEmergencyFromVoice,
  createEmergencyVoiceHandler,
  handleMulterUpload,
};
