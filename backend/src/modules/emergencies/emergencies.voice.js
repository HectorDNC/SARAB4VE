/**
 * Endpoint POST /api/emergencies/voice — reporte de emergencia por voz.
 *
 * Permite crear una emergencia enviando un archivo de audio + transcripción.
 * El audio se sube a R2 y el registro se guarda con report_origin='voz'.
 *
 * Schemas Zod (EmergenciaVozSchema) para validación + documentación OpenAPI.
 */

const { z } = require("zod");
const { extendZodWithOpenApi } = require("@asteasolutions/zod-to-openapi");

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
    .min(1, "transcript es requerido (texto transcrito del audio)")
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
// Servicio — lógica de negocio
// ---------------------------------------------------------------------------

const db = require("../../db");
const { uploadAudio } = require("../../services/storage");
const { extraerInformacionEmergencia } = require("./extractorEmergencia");

/**
 * Inserta una emergencia por voz en la base de datos.
 *
 * @param {Object} payload — cuerpo validado del request (campos en camelCase)
 * @param {Object|null} audioFile — archivo de audio subido por multer, o null
 * @returns {Promise<Object>} fila insertada
 */
async function createEmergencyFromVoice(payload, audioFile) {
  const transcript = payload.transcript.trim();

  // ── Extraer información estructurada del transcript (Groq + fallback) ──
  const infoExtraida = await extraerInformacionEmergencia(transcript);
  console.log("[createEmergencyFromVoice] Información extraída:", infoExtraida);
  // ── Subir audio a R2 si está presente ──
  let voiceNoteUrl = null;

  if (audioFile && audioFile.buffer && audioFile.buffer.length > 0) {
    try {
      voiceNoteUrl = await uploadAudio(
        audioFile.buffer,
        audioFile.originalname || "audio.webm",
        audioFile.mimetype || "audio/webm",
      );
    } catch (err) {
      console.error("Error subiendo audio a R2:", err.message);
      // Fallback: guardar sin audio_url, el registro se crea igual
      voiceNoteUrl = null;
    }
  }

  // ── Normalizar payload (camelCase → valores para INSERT) ──
  // Los valores del payload tienen prioridad; si no vienen, se usan los inferidos por el extractor
  const requesterName = (payload.requesterName || infoExtraida.name || "Persona en emergencia").trim();

  const isInjured =
    payload.isInjured === true || payload.isInjured === "true" || infoExtraida.isInjured;
  const cannotMove =
    payload.cannotMove === true || payload.cannotMove === "true" || infoExtraida.cannotMove;

  const disabilityType =
    (payload.disabilityType && DISABILITY_TYPES.includes(payload.disabilityType))
      ? payload.disabilityType
      : (infoExtraida.disabilityType || "motriz");

  // description: si no se envió explícitamente, usar el resumen del extractor o el transcript
  const description =
    payload.description && payload.description !== transcript
      ? payload.description.trim()
      : (infoExtraida.resumen || transcript);

  // needType: usar tipo_emergencia del payload, sino el tipo del extractor, sino transcript
  const needType = payload.tipo_emergencia?.trim()
    ? payload.tipo_emergencia.trim()
    : (infoExtraida.tipo || payload.needType?.trim() || transcript.slice(0, 50));

  const latitude = Number(payload.latitude);
  const longitude = Number(payload.longitude);
  
  // urgency: mapear severidad del extractor a urgency si no se especificó
  let urgency = payload.urgency;
  if (!urgency && infoExtraida.severidad) {
    urgency = 
      infoExtraida.severidad === "alta" ? "critical" :
      infoExtraida.severidad === "media" ? "high" :
      "medium";
  }
  urgency = urgency || "high";

  const communicationMode =
    payload.communicationMode?.trim() || infoExtraida.communicationMode || null;
  const disabilitySubcategory =
    payload.disabilitySubcategory?.trim() || infoExtraida.disabilitySubcategory || null;
  const extraInfo = payload.extraInfo?.trim() || null;
  const voiceNoteDurationSec = payload.voiceNoteDurationSec
    ? Number(payload.voiceNoteDurationSec)
    : null;

  // ── INSERT ──
  const result = await db.query(
    `INSERT INTO emergencies (
        requester_name, is_injured, cannot_move, disability_type,
        communication_mode, disability_subcategory, extra_info,
        voice_note_url, voice_note_duration_sec,
        latitude, longitude, urgency, need_type, description,
        report_origin, transcript
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
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
      voiceNoteUrl,
      voiceNoteDurationSec,
      latitude,
      longitude,
      urgency,
      needType,
      description,
      "voz", // report_origin
      transcript,
    ],
  );

  return {
    emergency: result.rows[0],
    infoEmergencia: infoExtraida,
  };
}

// ---------------------------------------------------------------------------
// Controlador — handler HTTP
// ---------------------------------------------------------------------------

/**
 * POST /api/emergencies/voice
 *
 * Requiere autenticación (cualquier rol autenticado).
 * Acepta multipart/form-data con archivo de audio + campos.
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

      const { emergency, infoEmergencia } = await createEmergencyFromVoice(parsed.data, audioFile);

      return res.status(201).json({ data: emergency, infoEmergencia });
    } catch (error) {
      return next(error);
    }
  };
}

// ---------------------------------------------------------------------------
// Multer — middleware para parsear multipart/form-data con archivo de audio
// ---------------------------------------------------------------------------

const multer = require("multer");

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
