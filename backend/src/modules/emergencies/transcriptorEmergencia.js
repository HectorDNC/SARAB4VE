/**
 * Transcripción de audio de emergencia a texto.
 *
 * Arquitectura:
 *   Nivel 1 — Gemini (Google AI Studio): envía el audio como inline
 *             base64 y recibe un JSON con la transcripción + campos
 *             estructurados de la emergencia (tipo, severidad, etc.).
 *
 * Si Gemini no está disponible, falla o el audio excede el límite
 * inline, `obtenerTranscript` devuelve
 *   { transcript: null, metodoTranscripcion: 'ninguno' }
 * y el endpoint de voz sigue funcionando — el registro se guarda para
 * revisión manual del usuario.
 *
 * Precedencia en el endpoint de voz:
 *   1. Si el cliente ya envía `transcript` (Web Speech API →
 *      "cliente-webspeech"), se respeta y NO se llama a Gemini.
 *   2. Si no, y hay audio adjunto, se intenta Gemini.
 *   3. Si Gemini falla, el registro se guarda con `metodoTranscripcion`
 *      = "ninguno" para revisión manual.
 *
 * @module emergencies/transcriptorEmergencia
 */

const { performance } = require("perf_hooks");

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

/** MIME types aceptados por Gemini inline (audio). Ver
 *  https://ai.google.dev/gemini-api/docs/audio */
const SUPPORTED_GEMINI_MIME_TYPES = new Set([
  "audio/wav",
  "audio/mp3",
  "audio/aiff",
  "audio/aac",
  "audio/ogg",
  "audio/flac",
  "audio/mp4",
  "audio/webm", // Gemini 1.5+ lo soporta vía Opus en webm
  "audio/x-m4a",
]);

/** Límite para inline data en Gemini: ~20 MB en la mayoría de modelos
 *  actuales. Más allá, hay que usar Files API (no implementado aquí —
 *  devolvemos null y el usuario revisa manualmente). */
const GEMINI_INLINE_MAX_BYTES = 20 * 1024 * 1024;

/** Timeout para la transcripción con Gemini. */
const GEMINI_TIMEOUT_MS = 10000;

// ---------------------------------------------------------------------------
// NIVEL 1 — Gemini (transcripción de audio)
// ---------------------------------------------------------------------------

/**
 * Prompt que se envía junto al audio: le pedimos a Gemini que
 * transcriba el audio en español (Venezuela) y que devuelva además un
 * JSON con la misma estructura ya usada por el extractor
 * (clasificación), para que la cascada actual siga funcionando sin
 * cambios.
 *
 * El campo `transcripcion` se añade explícitamente para que el
 * extractor pueda guardarlo en BD si así se requiere.
 */
const TRANSCRIPTION_SYSTEM_PROMPT = `Eres un asistente de emergencias en Venezuela. Recibirás un clip de audio en español.

Tu tarea tiene dos partes:
1. Transcribe el audio TEXTUALMENTE tal como lo escuchas, incluyendo muletillas si las hay, sin inventar contenido. Si el audio está silencioso o es ininteligible, devuelve una cadena vacía.
2. A partir de esa transcripción, devuelve también un objeto JSON con la siguiente estructura (clasificación de la emergencia):

{
  "tipo": "incendio" | "medica" | "inundacion" | "violencia" | "estructural" | "otro" | null,
  "severidad": "baja" | "media" | "alta" | null,
  "personasAfectadas": number | null,
  "resumen": "oración corta con la esencia del reporte",
  "palabrasClaveDetectadas": ["palabras", "clave"],
  "disabilityType": "visual" | "auditiva" | "neuro" | "motriz" | null,
  "communicationMode": "lengua_senas" | "audifono" | "implante_coclear" | "vibrador_oseo" | null,
  "disabilitySubcategory": "guia_voz" | "braille" | "perro_guia" | "ambiente_calmado" | "comunicacion_clara" | "acompanamiento" | "silla_ruedas" | "traslado_asistido" | "evacuacion_accesible" | null,
  "isInjured": true | false,
  "cannotMove": true | false,
  "name": "nombre de la persona que reporta o necesita ayuda, si se menciona en el transcript, sino null",
  "transcripcion": "transcripción literal del audio (la misma cadena que generaste arriba)"
}

Reglas:
- severidad: "alta" = vidas en riesgo; "media" = posibles heridos; "baja" = controlable.
- disabilityType: ciego=visual, sordo=auditiva, autismo=neuro, silla de ruedas=motriz.
- name: extrae el nombre de la persona si se menciona explícitamente (ej. "Soy María", "Me llamo Pedro", "Mi nombre es Juan"), sino null.
- Si el audio no es inteligible, devuelve "transcripcion": "" y los demás campos en null/false/[].
- Responde SOLO el JSON, sin markdown, sin backticks, sin texto adicional.`;

/**
 * Normaliza un MIME type a uno que Gemini acepte inline. Si el cliente
 * envía algo exótico (audio/x-m4a, audio/opus), lo mapea al más cercano
 * soportado.
 */
function normalizeMimeType(mimeType) {
  if (!mimeType) return "audio/wav";
  const base = mimeType.toLowerCase().split(";")[0].trim();
  if (SUPPORTED_GEMINI_MIME_TYPES.has(base)) return base;

  // Mapeos comunes desde MediaRecorder del frontend
  if (base === "audio/opus") return "audio/ogg";
  if (base === "audio/m4a") return "audio/x-m4a";
  if (base === "audio/mpeg") return "audio/mp3";
  if (base === "audio/x-wav") return "audio/wav";

  return base;
}

/**
 * Convierte un Buffer a string base64 sin saltos de línea (formato
 * que Gemini espera en inline_data).
 */
function bufferToBase64(buffer) {
  return buffer.toString("base64");
}

/**
 * Extrae el primer objeto JSON válido encontrado en un texto, igual
 * que hace extractorEmergencia. Reimplementado localmente para no
 * crear acoplamiento entre los dos módulos.
 */
function extractJSON(text) {
  if (!text || typeof text !== "string") return null;
  const objectMatch = text.match(/\{[\s\S]*\}/);
  if (objectMatch) return objectMatch[0];
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (arrayMatch) return arrayMatch[0];
  return null;
}

function stripMarkdownCodeBlocks(text) {
  return text.replace(/```(?:json|JSON)?\s*\n?([\s\S]*?)\n?```/g, "$1").trim();
}

/**
 * Transcribe un audio usando Gemini (Nivel 1).
 *
 * Devuelve:
 *   - `{ transcript, rawInfo, provider }` si la llamada fue exitosa
 *     (transcript puede ser cadena vacía si Gemini no entendió el audio).
 *   - `null` si:
 *       • no hay GEMINI_API_KEY,
 *       • el audio excede el límite de inline data,
 *       • timeout (10s),
 *       • error de red o HTTP,
 *       • la respuesta no es JSON parseable.
 *
 * NUNCA lanza excepción hacia arriba.
 *
 * @param {Buffer} audioBuffer
 * @param {string} mimeType
 * @returns {Promise<{transcript: string, rawInfo: Object, provider: string}|null>}
 */
async function transcribirConGemini(audioBuffer, mimeType) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  if (!audioBuffer || audioBuffer.length === 0) {
    console.warn("[transcriptorEmergencia] transcribirConGemini: buffer vacío");
    return null;
  }

  if (audioBuffer.length > GEMINI_INLINE_MAX_BYTES) {
    console.warn(
      `[transcriptorEmergencia] audio de ${audioBuffer.length} bytes excede el límite inline de Gemini (${GEMINI_INLINE_MAX_BYTES}).`,
    );
    return null;
  }

  const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
  const startTime = performance.now();

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: TRANSCRIPTION_SYSTEM_PROMPT },
              {
                inline_data: {
                  mime_type: normalizeMimeType(mimeType),
                  data: bufferToBase64(audioBuffer),
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2000,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "unknown");
      console.warn(
        `[transcriptorEmergencia] Gemini API error: ${response.status} ${response.statusText} — ${errorText.slice(0, 200)}`,
      );
      return null;
    }

    const data = await response.json();
    const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    const duration = performance.now() - startTime;
    console.log('content', content);
    if (!content || typeof content !== "string") {
      console.warn(
        `[transcriptorEmergencia] Gemini devolvió respuesta sin contenido (${duration.toFixed(2)}ms)`,
      );
      return null;
    }

    // Limpiar markdown y extraer JSON
    let cleaned = stripMarkdownCodeBlocks(content);
    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const extracted = extractJSON(cleaned);
      if (extracted) {
        try {
          parsed = JSON.parse(extracted);
        } catch {
          // ignore
        }
      }
    }

    if (!parsed || typeof parsed !== "object") {
      console.warn(
        `[transcriptorEmergencia] Gemini devolvió JSON no parseable tras ${duration.toFixed(2)}ms:`,
        content.slice(0, 300),
      );
      return null;
    }

    const transcript = typeof parsed.transcripcion === "string" ? parsed.transcripcion.trim() : "";

    console.log(
      `[transcriptorEmergencia] Gemini transcripción OK en ${duration.toFixed(2)}ms (transcript: ${transcript.length} chars)`,
    );

    return {
      transcript,
      rawInfo: parsed,
      provider: "gemini",
    };
  } catch (err) {
    clearTimeout(timeoutId);
    const duration = performance.now() - startTime;
    if (err.name === "AbortError") {
      console.warn(
        `[transcriptorEmergencia] Gemini timeout tras ${duration.toFixed(2)}ms (${GEMINI_TIMEOUT_MS}ms)`,
      );
    } else {
      console.warn(
        `[transcriptorEmergencia] Gemini error tras ${duration.toFixed(2)}ms:`,
        err.message,
      );
    }
    return null;
  }
}

// ---------------------------------------------------------------------------
// ORQUESTADOR
// ---------------------------------------------------------------------------

/**
 * Resultado de la transcripción.
 * @typedef {Object} TranscriptResult
 * @property {string|null} transcript            — texto transcrito (o null si falló)
 * @property {Object|null} rawInfo               — JSON crudo devuelto por Gemini (si vino de ahí)
 * @property {"gemini"|"ninguno"} metodoTranscripcion
 */

/**
 * Cascada de transcripción de audio a texto.
 *
 *   Nivel 1 — Gemini (si GEMINI_API_KEY está configurada y el audio
 *             es <= 20 MB).
 *
 * Si Gemini falla, devuelve `{ transcript: null, metodoTranscripcion: 'ninguno' }`.
 * NUNCA lanza excepción.
 *
 * @param {Buffer} audioBuffer
 * @param {string} mimeType
 * @returns {Promise<TranscriptResult>}
 */
async function obtenerTranscript(audioBuffer, mimeType) {
  if (!audioBuffer || audioBuffer.length === 0) {
    return { transcript: null, rawInfo: null, metodoTranscripcion: "ninguno" };
  }

  // Nivel 1 — Gemini
  const geminiResult = await transcribirConGemini(audioBuffer, mimeType);
  if (geminiResult && geminiResult.transcript) {
    return {
      transcript: geminiResult.transcript,
      rawInfo: geminiResult.rawInfo,
      metodoTranscripcion: "gemini",
    };
  }

  // Nada funcionó — el registro se guarda para revisión manual
  return { transcript: null, rawInfo: null, metodoTranscripcion: "ninguno" };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  obtenerTranscript,
  transcribirConGemini,
  // Exportado para testing
  _internal: {
    normalizeMimeType,
    bufferToBase64,
    extractJSON,
    stripMarkdownCodeBlocks,
  },
};
