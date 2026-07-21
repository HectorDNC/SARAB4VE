/**
 * Extracción de información estructurada desde un transcript de emergencia.
 *
 * Arquitectura en cascada:
 *   Nivel 1 — LLM (Google AI Studio / Gemini, modelo gemini-3.1-flash-lite por defecto)
 *   Nivel 1B — Fallback LLM (Groq API, llama-3.3-70b-versatile)
 *   Nivel 2 — Fallback por diccionario de palabras clave (offline, sin deps)
 *
 * El orquestador `extraerInformacionEmergencia` intenta primero con Gemini,
 * luego con Groq si el primero falla, y finalmente cae al diccionario si
 * ningún proveedor de IA está disponible.
 *
 * @module emergencies/extractorEmergencia
 */

const { z } = require("zod");
const { performance } = require("perf_hooks");

// ---------------------------------------------------------------------------
// Constantes del dominio
// ---------------------------------------------------------------------------

const TIPOS_EMERGENCIA = [
  "incendio",
  "medica",
  "inundacion",
  "violencia",
  "estructural",
  "otro",
];

const SEVERIDADES = ["baja", "media", "alta"];

const DISABILITY_TYPES = ["visual", "auditiva", "neuro", "motriz"];

const COMMUNICATION_MODES = [
  "lengua_senas",
  "audifono",
  "implante_coclear",
  "vibrador_oseo",
];

const DISABILITY_SUBCATEGORIES = [
  "guia_voz",
  "braille",
  "perro_guia",
  "ambiente_calmado",
  "comunicacion_clara",
  "acompanamiento",
  "silla_ruedas",
  "traslado_asistido",
  "evacuacion_accesible",
];

// ---------------------------------------------------------------------------
// Schema Zod para el resultado de extracción
// ---------------------------------------------------------------------------

/**
 * Schema Zod que valida la salida tanto del LLM como del diccionario.
 */
const InfoEmergenciaSchema = z.object({
  tipo: z.enum(TIPOS_EMERGENCIA).nullable(),
  severidad: z.enum(SEVERIDADES).nullable(),
  personasAfectadas: z.number().int().min(0).nullable(),
  resumen: z.string(),
  palabrasClaveDetectadas: z.array(z.string()),
  // Campos inferidos del transcript
  name: z.string().nullable().default(null),
  disabilityType: z.enum(DISABILITY_TYPES).nullable().default(null),
  communicationMode: z.enum(COMMUNICATION_MODES).nullable().default(null),
  disabilitySubcategory: z.enum(DISABILITY_SUBCATEGORIES).nullable().default(null),
  isInjured: z.boolean().default(false),
  cannotMove: z.boolean().default(false),
});

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

/**
 * Normaliza un string: minúsculas, sin tildes, sin caracteres especiales.
 * @param {string} str
 * @returns {string}
 */
function normalize(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remover diacríticos (tildes, etc.)
    .replace(/[^a-z0-9\s]/g, " ") // solo alfanumérico
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Elimina bloques de código markdown (```json ... ```) que el LLM pueda agregar.
 * @param {string} text
 * @returns {string}
 */
function stripMarkdownCodeBlocks(text) {
  // Remover ```json ... ``` o ``` ... ```, con o sin saltos de línea
  return text.replace(/```(?:json|JSON)?\s*\n?([\s\S]*?)\n?```/g, "$1").trim();
}

/**
 * Extrae el primer objeto JSON válido encontrado en un texto.
 * Útil cuando el LLM agrega texto explicativo antes o después del JSON,
 * o cuando el markdown no se limpia completamente.
 * @param {string} text
 * @returns {string|null}
 */
function extractJSON(text) {
  if (!text || typeof text !== "string") return null;

  // Intentar primero encontrar un objeto JSON entre llaves
  const objectMatch = text.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    return objectMatch[0];
  }

  // Intentar con un array JSON
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    return arrayMatch[0];
  }

  return null;
}

// ---------------------------------------------------------------------------
// Prompt compartido para extracción estructurada
// ---------------------------------------------------------------------------

const EXTRACTION_SYSTEM_PROMPT = `Clasifica el siguiente reporte de emergencia hablado en español (Venezuela) y devuelve ÚNICAMENTE un objeto JSON válido, sin markdown, sin backticks y sin texto adicional.

Estructura obligatoria:
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
  "ubicacion": "opcional, si se puede inferir del reporte, sino null"
}

Reglas:
- Usa los valores exactos de los enums o null.
- severidad: "alta" = vidas en riesgo; "media" = posibles heridos; "baja" = controlable.
- disabilityType: ciego=visual, sordo=auditiva, autismo=neuro, silla de ruedas=motriz.
- name: extrae el nombre de la persona si se menciona explícitamente en el transcript (ej. "Soy María", "Me llamo Pedro", "Mi nombre es Juan"), sino null.
- Responde SOLO el JSON.`;

/**
 * Parsea y valida el contenido JSON devuelto por cualquier proveedor de LLM.
 * @param {string} rawContent
 * @param {string} providerName — nombre usado en logs
 * @returns {Object|null}
 */
function parseAndValidateLLMResponse(rawContent, providerName) {
  if (!rawContent || typeof rawContent !== "string") {
    console.warn(`[extractorEmergencia] ${providerName} response missing content field`);
    return null;
  }

  // Primero intentar limpiar markdown; si aún falla, extraer el primer JSON válido
  let cleaned = stripMarkdownCodeBlocks(rawContent);
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const extracted = extractJSON(cleaned);
    if (extracted) {
      try {
        parsed = JSON.parse(extracted);
      } catch {
        // ignorar; se reporta más abajo con el contenido original
      }
    }
  }

  if (!parsed) {
    console.warn(
      `[extractorEmergencia] ${providerName} returned invalid JSON (raw content):`,
      rawContent.slice(0, 500),
    );
    return null;
  }

  const validated = InfoEmergenciaSchema.safeParse(parsed);
  if (!validated.success) {
    console.warn(
      `[extractorEmergencia] ${providerName} result failed Zod validation:`,
      validated.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", "),
    );
    return null;
  }

  return validated.data;
}

// ---------------------------------------------------------------------------
// NIVEL 1A — Extracción vía Google AI Studio / Gemini
// ---------------------------------------------------------------------------

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const GEMINI_DEFAULT_MODEL = "gemini-3.1-flash-lite";
const GEMINI_TIMEOUT_MS = 10000;
const GEMINI_MAX_OUTPUT_TOKENS = 1500;

/**
 * Extrae información estructurada de un transcript usando la API de Google AI Studio (Gemini).
 *
 * Devuelve null si:
 * - GEMINI_API_KEY no está configurada
 * - Timeout (8s)
 * - Error de red o HTTP
 * - JSON inválido en la respuesta
 * - El resultado no pasa el schema Zod
 *
 * @param {string} transcript — texto transcrito del audio de emergencia
 * @returns {Promise<Object|null>}
 */
async function extraerConGemini(transcript) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const model = process.env.GEMINI_MODEL || GEMINI_DEFAULT_MODEL;
  const url = `${GEMINI_API_URL}/${model}:generateContent?key=${apiKey}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
  const startTime = performance.now();

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: EXTRACTION_SYSTEM_PROMPT },
              { text: transcript },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "unknown");
      console.warn(
        `[extractorEmergencia] Gemini API error: ${response.status} ${response.statusText} — ${errorText.slice(0, 200)}`,
      );
      return null;
    }

    const data = await response.json();
    const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    const duration = performance.now() - startTime;

    const result = parseAndValidateLLMResponse(content, "Gemini");
    if (result) {
      console.log(`[extractorEmergencia] Gemini extraction succeeded in ${duration.toFixed(2)}ms`);
    } else {
      console.warn(`[extractorEmergencia] Gemini extraction failed after ${duration.toFixed(2)}ms`);
    }
    return result;
  } catch (err) {
    clearTimeout(timeoutId);
    const duration = performance.now() - startTime;

    if (err.name === "AbortError") {
      console.warn(`[extractorEmergencia] Gemini request timed out after ${duration.toFixed(2)}ms (${GEMINI_TIMEOUT_MS}ms limit)`);
    } else {
      console.warn(`[extractorEmergencia] Gemini request failed after ${duration.toFixed(2)}ms:`, err.message);
    }
    return null;
  }
}

// ---------------------------------------------------------------------------
// NIVEL 1B — Extracción vía Groq (fallback)
// ---------------------------------------------------------------------------

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_DEFAULT_MODEL = "llama-3.3-70b-versatile";
const GROQ_TIMEOUT_MS = 5000;
const GROQ_MAX_TOKENS = 1000;

/**
 * Extrae información estructurada de un transcript usando la API gratuita de Groq.
 *
 * Devuelve null si:
 * - GROQ_API_KEY no está configurada
 * - Timeout (5s)
 * - Error de red o HTTP
 * - JSON inválido en la respuesta
 * - El resultado no pasa el schema Zod
 *
 * @param {string} transcript — texto transcrito del audio de emergencia
 * @returns {Promise<Object|null>}
 */
async function extraerConGroq(transcript) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return null;
  }

  const model = process.env.GROQ_MODEL || GROQ_DEFAULT_MODEL;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GROQ_TIMEOUT_MS);
  const startTime = performance.now();

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
          { role: "user", content: transcript },
        ],
        temperature: 0.1,
        max_tokens: GROQ_MAX_TOKENS,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "unknown");
      console.warn(
        `[extractorEmergencia] Groq API error: ${response.status} ${response.statusText} — ${errorText.slice(0, 200)}`,
      );
      return null;
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    const duration = performance.now() - startTime;

    const result = parseAndValidateLLMResponse(content, "Groq");
    if (result) {
      console.log(`[extractorEmergencia] Groq extraction succeeded in ${duration.toFixed(2)}ms`);
    } else {
      console.warn(`[extractorEmergencia] Groq extraction failed after ${duration.toFixed(2)}ms`);
    }
    return result;
  } catch (err) {
    clearTimeout(timeoutId);
    const duration = performance.now() - startTime;

    if (err.name === "AbortError") {
      console.warn(`[extractorEmergencia] Groq request timed out after ${duration.toFixed(2)}ms (${GROQ_TIMEOUT_MS}ms limit)`);
    } else {
      console.warn(`[extractorEmergencia] Groq request failed after ${duration.toFixed(2)}ms:`, err.message);
    }
    return null;
  }
}

// ---------------------------------------------------------------------------
// NIVEL 1 — Extracción vía IA (Gemini primero, Groq como fallback)
// ---------------------------------------------------------------------------

/**
 * Extrae información estructurada intentando primero Google AI Studio (Gemini)
 * y, si falla, Groq como proveedor alternativo.
 *
 * @param {string} transcript — texto transcrito del audio de emergencia
 * @returns {Promise<Object|null>}
 */
async function extraerConIA(transcript) {
  const geminiResult = await extraerConGemini(transcript);
  if (geminiResult) {
    return geminiResult;
  }

  return extraerConGroq(transcript);
}

// ---------------------------------------------------------------------------
// NIVEL 2 — Fallback por diccionario de palabras clave (offline)
// ---------------------------------------------------------------------------

/**
 * Diccionario de keywords para inferir discapacidad, comunicación, subcategorías,
 * si está herido y si no puede moverse. Incluye variantes venezolanas.
 */
const DISABILITY_KEYWORDS = {
  visual: [
    "no veo", "no ve", "ciego", "ciega", "ceguera", "perdi la vista",
    "perdi la vision", "debilidad visual", "no distingo", "borroso",
    "baston", "perro guia",
  ],
  auditiva: [
    "no oigo", "no oye", "sordo", "sorda", "sordera", "no escucho",
    "no escucha", "audifono", "audifonos", "implante coclear",
    "lengua de senas", "lenguaje de senas",
  ],
  neuro: [
    "autismo", "autista", "asperger", "tdah", "deficit de atencion",
    "ansiedad", "ataque de panico", "panico", "desorientado",
    "desorientada", "confundido", "confundida", "no entiende",
    "discapacidad cognitiva", "down", "sindrome de down",
  ],
  motriz: [
    "no puedo caminar", "no camina", "silla de ruedas", "muletas",
    "paralisis", "paralitico", "amputado", "amputacion",
    "no me muevo", "no se mueve", "inmovil", "postrado",
    "postrada", "cama", "camilla", "andadera",
    "no tiene fuerza", "debilidad muscular",
  ],
};

/** Diccionario para inferir modo de comunicación. */
const COMM_MODE_KEYWORDS = [
  { mode: "lengua_senas", keywords: ["lengua de senas", "lenguaje de senas", "senas", "lsc", "interprete de senas"] },
  { mode: "audifono", keywords: ["audifono", "audifonos", "auxiliar auditivo"] },
  { mode: "implante_coclear", keywords: ["implante coclear", "implante", "coclear"] },
  { mode: "vibrador_oseo", keywords: ["vibrador oseo", "conduccion osea"] },
];

/** Diccionario para inferir subcategoría de discapacidad. */
const SUBCATEGORY_KEYWORDS = [
  { subcat: "silla_ruedas", keywords: ["silla de ruedas", "silla ruedas"] },
  { subcat: "traslado_asistido", keywords: ["traslado asistido", "ayuda para moverme", "no puedo moverme solo", "no puedo moverme sola"] },
  { subcat: "evacuacion_accesible", keywords: ["evacuacion accesible", "rampa", "elevador", "ascensor"] },
  { subcat: "braille", keywords: ["braille"] },
  { subcat: "perro_guia", keywords: ["perro guia", "perro de guia"] },
  { subcat: "guia_voz", keywords: ["guia por voz", "instrucciones verbales", "guiado por voz"] },
  { subcat: "ambiente_calmado", keywords: ["ambiente calmado", "ambiente tranquilo", "espacio tranquilo"] },
  { subcat: "comunicacion_clara", keywords: ["comunicacion clara", "instrucciones claras", "lenguaje simple"] },
  { subcat: "acompanamiento", keywords: ["acompanamiento", "alguien que me acompañe"] },
];

/** Palabras clave para detectar si la persona está herida. */
const INJURED_KEYWORDS = [
  "herido", "herida", "heridos", "sangre", "sangrando", "fractura",
  "golpe", "contusion", "lesion", "lesionado", "lesionada", "accidente",
  "atropellado", "atropellada", "puñalada", "balazo", "quemadura", "quemado",
];

/** Palabras clave para detectar si la persona no puede moverse. */
const CANNOT_MOVE_KEYWORDS = [
  "no puedo caminar", "no puedo moverme", "no me puedo mover",
  "no camina", "no se mueve", "inmovil", "postrado", "postrada",
  "estoy en cama", "paralitico", "paralisis", "silla de ruedas",
  "no tiene fuerza", "debilidad muscular",
];

/**
 * Infiere el tipo de discapacidad desde el transcript.
 * Siempre devuelve un valor válido del enum o null.
 */
function inferirDisabilityType(transcript) {
  if (!transcript) return null;
  try {
    const texto = normalize(transcript);
    let bestType = null;
    let bestScore = 0;
    for (const [tipo, keywords] of Object.entries(DISABILITY_KEYWORDS)) {
      let score = 0;
      for (const kw of keywords) {
        if (containsWord(texto, normalize(kw))) score += 1;
      }
      if (score > bestScore) { bestScore = score; bestType = tipo; }
    }
    return bestType;
  } catch { return null; }
}

/**
 * Infiere el modo de comunicación desde el transcript.
 */
function inferirCommunicationMode(transcript) {
  if (!transcript) return null;
  try {
    const texto = normalize(transcript);
    for (const { mode, keywords } of COMM_MODE_KEYWORDS) {
      for (const kw of keywords) {
        if (containsWord(texto, normalize(kw))) return mode;
      }
    }
    return null;
  } catch { return null; }
}

/**
 * Infiere la subcategoría de discapacidad.
 */
function inferirDisabilitySubcategory(transcript) {
  if (!transcript) return null;
  try {
    const texto = normalize(transcript);
    for (const { subcat, keywords } of SUBCATEGORY_KEYWORDS) {
      for (const kw of keywords) {
        if (containsWord(texto, normalize(kw))) return subcat;
      }
    }
    return null;
  } catch { return null; }
}

/**
 * Infiere si la persona está herida.
 */
function inferirIsInjured(transcript) {
  if (!transcript) return false;
  try {
    const texto = normalize(transcript);
    return INJURED_KEYWORDS.some((kw) => containsWord(texto, normalize(kw)));
  } catch { return false; }
}

/**
 * Infiere si la persona no puede moverse.
 */
function inferirCannotMove(transcript) {
  if (!transcript) return false;
  try {
    const texto = normalize(transcript);
    return CANNOT_MOVE_KEYWORDS.some((kw) => containsWord(texto, normalize(kw)));
  } catch { return false; }
}

/**
 * Diccionario de clasificación por palabras clave de emergencia.
 *
 * Cada tipo de emergencia tiene palabras/frases en español,
 * incluyendo variantes venezolanas.
 *
 * Las claves se buscan normalizadas (minúsculas, sin tildes).
 */
const KEYWORD_DICT = {
  incendio: {
    keywords: [
      "incendio", "fuego", "candela", "llamas", "quemando", "quemazon",
      "ardiendo", "se quema", "se esta quemando", "humo", "explosion",
      "combustion", "prende fuego", "prendio fuego", "cortocircuito",
    ],
    severityHint: "media",
  },
  medica: {
    keywords: [
      "herido", "herida", "heridos", "sangre", "sangrando", "desmayo",
      "desmayado", "inconsciente", "no respira", "respirar", "infarto",
      "ataque", "convulsion", "fiebre", "enfermo", "enferma", "enfermedad",
      "medica", "medico", "doctor", "hospital", "emergencia medica",
      "dolor de pecho", "dificultad para respirar", "accidente",
      "atropellado", "fractura", "golpe", "contusion",
    ],
    severityHint: "alta",
  },
  inundacion: {
    keywords: [
      "inundacion", "inundado", "inundada", "agua", "crecida", "desborde",
      "desbordamiento", "lluvia fuerte", "lloviendo mucho", "rio",
      "quebrada", "torrente", "represa", "drenaje", "cloaca",
      "nivel del agua", "subio el agua", "anegado",
    ],
    severityHint: "media",
  },
  violencia: {
    keywords: [
      "violencia", "golpes", "pelea", "agresion", "agredido", "maltrato",
      "abuso", "amenaza", "amenazado", "pistola", "arma", "cuchillo",
      "navaja", "robo", "robaron", "asalto", "secuestro", "secuestrado",
      "disparos", "tiros", "balacera", "apuñalado", "acuchillado",
    ],
    severityHint: "alta",
  },
  estructural: {
    keywords: [
      "derrumbe", "derrumbado", "colapso", "colapso estructural",
      "grieta", "grietas", "pared agrietada", "techo cayo", "se cayo el techo",
      "edificio", "estructura", "cimiento", "columna rota", "terremoto",
      "sismo", "temblor", "vibracion fuerte", "desplome",
    ],
    severityHint: "alta",
  },
};

/**
 * Busca una palabra o frase como token completo dentro del texto normalizado.
 * Evita falsos positivos como "urgente" conteniendo "gente".
 * @param {string} normalizedText — texto ya normalizado
 * @param {string} term — término ya normalizado a buscar
 * @returns {boolean}
 */
function containsWord(normalizedText, term) {
  // Para frases multi-palabra, usar includes directo es suficiente
  if (term.includes(" ")) {
    return normalizedText.includes(term);
  }
  // Para palabras simples, buscar como token completo (rodeado de espacios o bordes)
  const regex = new RegExp(`(?:^|\\s)${term}(?:\\s|$|[^a-z0-9])`);
  return regex.test(normalizedText);
}

/**
 * Clasifica un transcript de emergencia usando un diccionario de palabras clave.
 *
 * Esta función NUNCA falla ni lanza excepción — siempre devuelve un resultado.
 *
 * @param {string} transcript — texto transcrito del audio de emergencia
 * @returns {Object} InfoEmergencia (siempre válido)
 */
function clasificarPorPalabrasClave(transcript) {
  try {
    const normalizedText = normalize(transcript);
    const words = normalizedText.split(" ");

    let bestType = null;
    let bestScore = 0;
    let bestSeverityHint = null;
    const matchedKeywords = [];

    for (const [tipo, config] of Object.entries(KEYWORD_DICT)) {
      let score = 0;

      for (const keyword of config.keywords) {
        const normalizedKw = normalize(keyword);

        // Buscar como token completo para evitar falsos positivos
        if (containsWord(normalizedText, normalizedKw)) {
          score += 1;
          matchedKeywords.push(keyword);
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestType = tipo;
        bestSeverityHint = config.severityHint;
      }
    }

    // ── Estimación de personas afectadas ──
    let personasAfectadas = null;
    const personasMatch = normalizedText.match(
      /(\d+)\s*(persona[s]?|gente|afectado[s]?|herido[s]?|victim[a|as])/i,
    );
    if (personasMatch) {
      personasAfectadas = parseInt(personasMatch[1], 10);
    } else {
      // Buscar menciones genéricas (como tokens completos)
      const plurales = ["personas", "heridos", "afectados", "victimas", "gente"];
      if (plurales.some((p) => containsWord(normalizedText, p))) {
        personasAfectadas = 2; // estimación mínima cuando se menciona plural sin número
      } else if (
        ["persona", "herido", "herida", "afectado", "afectada", "victima"].some(
          (s) => containsWord(normalizedText, s),
        )
      ) {
        personasAfectadas = 1;
      }
    }

    // ── Construir resumen ──
    const resumen =
      transcript.length > 150
        ? transcript.slice(0, 147).trim() + "..."
        : transcript.trim();

    // ── Resultado final ──
    const result = {
      tipo: bestType || "otro",
      severidad: bestScore >= 3 ? "alta" : bestScore >= 2 ? "media" : bestSeverityHint || null,
      personasAfectadas,
      resumen,
      palabrasClaveDetectadas: [...new Set(matchedKeywords)],
      // Campos inferidos del transcript
      name: null,
      disabilityType: inferirDisabilityType(transcript),
      communicationMode: inferirCommunicationMode(transcript),
      disabilitySubcategory: inferirDisabilitySubcategory(transcript),
      isInjured: inferirIsInjured(transcript),
      cannotMove: inferirCannotMove(transcript),
    };

    // Validar con Zod para garantizar conformidad
    const validated = InfoEmergenciaSchema.safeParse(result);
    if (!validated.success) {
      // Si algo falla, devolver el mínimo seguro
      return {
        tipo: "otro",
        severidad: null,
        personasAfectadas: null,
        resumen,
        palabrasClaveDetectadas: [],
        disabilityType: null,
        communicationMode: null,
        disabilitySubcategory: null,
        isInjured: false,
        cannotMove: false,
      };
    }

    return validated.data;
  } catch (_err) {
    // Garantía: esta función NUNCA lanza excepción
    return {
      tipo: "otro",
      severidad: null,
      personasAfectadas: null,
      resumen: transcript.slice(0, 150).trim(),
      palabrasClaveDetectadas: [],
      disabilityType: null,
      communicationMode: null,
      disabilitySubcategory: null,
      isInjured: false,
      cannotMove: false,
    };
  }
}

// ---------------------------------------------------------------------------
// ORQUESTADOR
// ---------------------------------------------------------------------------

/**
 * Extrae información estructurada de un transcript de emergencia.
 *
 * Intenta primero con Google AI Studio (Gemini). Si falla, intenta con Groq.
 * Si ambos proveedores de IA fallan, cae automáticamente al diccionario de
 * palabras clave (offline).
 *
 * @param {string} transcript — texto transcrito del audio de emergencia
 * @returns {Promise<Object>} InfoEmergencia con campo extra `metodoExtraccion`
 */
async function extraerInformacionEmergencia(transcript) {
  if (!transcript || typeof transcript !== "string" || transcript.trim() === "") {
    return {
      tipo: "otro",
      severidad: null,
      personasAfectadas: null,
      resumen: "",
      palabrasClaveDetectadas: [],
      disabilityType: null,
      communicationMode: null,
      disabilitySubcategory: null,
      isInjured: false,
      cannotMove: false,
      metodoExtraccion: "diccionario",
    };
  }

  // ── Nivel 1: intentar con IA (Gemini primero, luego Groq) ──
  const iaResult = await extraerConIA(transcript);
  if (iaResult) {
    console.log("[extractorEmergencia] Extracción exitosa vía IA");
    return {
      ...iaResult,
      metodoExtraccion: "ia",
    };
  }

  // ── Nivel 2: fallback a diccionario ──
  console.warn(
    "[extractorEmergencia] IA no disponible, usando fallback por diccionario de palabras clave",
  );

  const dictResult = clasificarPorPalabrasClave(transcript);
  return {
    ...dictResult,
    metodoExtraccion: "diccionario",
  };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  InfoEmergenciaSchema,
  TIPOS_EMERGENCIA,
  SEVERIDADES,
  DISABILITY_TYPES,
  COMMUNICATION_MODES,
  DISABILITY_SUBCATEGORIES,
  extraerConIA,
  extraerConGemini,
  extraerConGroq,
  clasificarPorPalabrasClave,
  extraerInformacionEmergencia,
  // Funciones de inferencia  (exportadas para voz.js y testing)
  inferirDisabilityType,
  inferirCommunicationMode,
  inferirDisabilitySubcategory,
  inferirIsInjured,
  inferirCannotMove,
  // Exportado para testing
  _internal: { normalize, stripMarkdownCodeBlocks, extractJSON, containsWord, KEYWORD_DICT },
};
