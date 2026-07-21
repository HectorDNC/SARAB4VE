/**
 * Tests unitarios para la cascada de transcripción de audio.
 *
 * Cubre:
 *  - Normalización de MIME types para Gemini
 *  - Buffer → base64
 *  - extractJSON / stripMarkdownCodeBlocks (utilidades locales)
 *  - transcribirConGemini con mocks de fetch (OK, JSON inválido, HTTP error, timeout, sin API key, audio vacío, audio > 20 MB)
 *  - obtenerTranscript (cascada completa):
 *      · Buffer vacío → metodoTranscripcion: 'ninguno'
 *      · Gemini OK → se usa Gemini
 *      · Gemini falla → metodoTranscripcion: 'ninguno' (registro para revisión manual)
 *      · Gemini responde transcript vacío → 'ninguno' (no se acepta como éxito)
 *
 *  No se hacen llamadas reales a Gemini. Todo está mockeado.
 */

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  obtenerTranscript,
  transcribirConGemini,
  _internal,
} = require("../src/modules/emergencies/transcriptorEmergencia");

// ---------------------------------------------------------------------------
// Tests: Utilidades internas
// ---------------------------------------------------------------------------

test("normalizeMimeType: devuelve audio/wav por defecto", () => {
  assert.equal(_internal.normalizeMimeType(undefined), "audio/wav");
  assert.equal(_internal.normalizeMimeType(""), "audio/wav");
  assert.equal(_internal.normalizeMimeType("audio/webm"), "audio/webm");
});

test("normalizeMimeType: mapea audio/opus a audio/ogg", () => {
  assert.equal(_internal.normalizeMimeType("audio/opus"), "audio/ogg");
  assert.equal(_internal.normalizeMimeType("AUDIO/OPUS"), "audio/ogg");
});

test("normalizeMimeType: ignora parámetros de MIME type", () => {
  assert.equal(_internal.normalizeMimeType("audio/webm;codecs=opus"), "audio/webm");
  assert.equal(_internal.normalizeMimeType("audio/ogg; codecs=vorbis"), "audio/ogg");
});

test("normalizeMimeType: pasa tal cual si es soportado", () => {
  assert.equal(_internal.normalizeMimeType("audio/mp4"), "audio/mp4");
  assert.equal(_internal.normalizeMimeType("audio/flac"), "audio/flac");
});

test("bufferToBase64: convierte Buffer a base64 sin saltos de línea", () => {
  const buf = Buffer.from("hola mundo");
  const b64 = _internal.bufferToBase64(buf);
  assert.equal(b64, "aG9sYSBtdW5kbw==");
  assert.ok(!b64.includes("\n"));
});

test("extractJSON: extrae el primer objeto JSON de un texto", () => {
  assert.equal(
    _internal.extractJSON('texto {"transcripcion": "hola", "tipo": "incendio"} más'),
    '{"transcripcion": "hola", "tipo": "incendio"}',
  );
  assert.equal(_internal.extractJSON("sin json"), null);
});

test("stripMarkdownCodeBlocks: remueve bloques ```json ...```", () => {
  const input = '```json\n{"a":1}\n```';
  assert.equal(_internal.stripMarkdownCodeBlocks(input), '{"a":1}');
});

// ---------------------------------------------------------------------------
// Tests: transcribirConGemini
// ---------------------------------------------------------------------------

test("transcribirConGemini: devuelve null si GEMINI_API_KEY no está configurada", async () => {
  const original = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  try {
    const result = await transcribirConGemini(Buffer.from("audio"), "audio/webm");
    assert.equal(result, null);
  } finally {
    if (original !== undefined) process.env.GEMINI_API_KEY = original;
  }
});

test("transcribirConGemini: devuelve null si el buffer está vacío", async () => {
  const original = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "test-key";

  try {
    const result = await transcribirConGemini(Buffer.alloc(0), "audio/webm");
    assert.equal(result, null);
  } finally {
    if (original !== undefined) process.env.GEMINI_API_KEY = original;
    else delete process.env.GEMINI_API_KEY;
  }
});

test("transcribirConGemini: devuelve null si el audio excede 20 MB", async () => {
  const original = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "test-key";

  try {
    const big = Buffer.alloc(21 * 1024 * 1024, 0);
    const result = await transcribirConGemini(big, "audio/webm");
    assert.equal(result, null);
  } finally {
    if (original !== undefined) process.env.GEMINI_API_KEY = original;
    else delete process.env.GEMINI_API_KEY;
  }
});

test("transcribirConGemini: parsea respuesta válida y devuelve {transcript, rawInfo, provider}", async (t) => {
  t.mock.method(global, "fetch", async () => ({
    ok: true,
    json: async () => ({
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  transcripcion: "hay un incendio en el edificio",
                  tipo: "incendio",
                  severidad: "alta",
                  personasAfectadas: 2,
                  resumen: "Incendio reportado",
                  palabrasClaveDetectadas: ["fuego", "humo"],
                  isInjured: false,
                  cannotMove: false,
                }),
              },
            ],
          },
        },
      ],
    }),
  }));

  const original = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "test-key";

  try {
    const result = await transcribirConGemini(Buffer.from("fake-audio"), "audio/webm");
    assert.ok(result);
    assert.equal(result.provider, "gemini");
    assert.equal(result.transcript, "hay un incendio en el edificio");
    assert.equal(result.rawInfo.tipo, "incendio");
    assert.equal(result.rawInfo.severidad, "alta");
  } finally {
    if (original !== undefined) process.env.GEMINI_API_KEY = original;
    else delete process.env.GEMINI_API_KEY;
  }
});

test("transcribirConGemini: parsea respuesta envuelta en bloque markdown", async (t) => {
  t.mock.method(global, "fetch", async () => ({
    ok: true,
    json: async () => ({
      candidates: [
        {
          content: {
            parts: [
              {
                text:
                  '```json\n{\n  "transcripcion": "ayuda por favor",\n  "tipo": "medica",\n  "severidad": "alta"\n}\n```',
              },
            ],
          },
        },
      ],
    }),
  }));

  const original = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "test-key";

  try {
    const result = await transcribirConGemini(Buffer.from("x"), "audio/webm");
    assert.equal(result.transcript, "ayuda por favor");
    assert.equal(result.rawInfo.tipo, "medica");
  } finally {
    if (original !== undefined) process.env.GEMINI_API_KEY = original;
    else delete process.env.GEMINI_API_KEY;
  }
});

test("transcribirConGemini: devuelve null si Gemini responde JSON inválido", async (t) => {
  t.mock.method(global, "fetch", async () => ({
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: "esto no es json" }] } }],
    }),
  }));

  const original = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "test-key";

  try {
    const result = await transcribirConGemini(Buffer.from("x"), "audio/webm");
    assert.equal(result, null);
  } finally {
    if (original !== undefined) process.env.GEMINI_API_KEY = original;
    else delete process.env.GEMINI_API_KEY;
  }
});

test("transcribirConGemini: devuelve null si Gemini responde HTTP error", async (t) => {
  t.mock.method(global, "fetch", async () => ({
    ok: false,
    status: 500,
    statusText: "Internal Server Error",
    text: async () => "boom",
  }));

  const original = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "test-key";

  try {
    const result = await transcribirConGemini(Buffer.from("x"), "audio/webm");
    assert.equal(result, null);
  } finally {
    if (original !== undefined) process.env.GEMINI_API_KEY = original;
    else delete process.env.GEMINI_API_KEY;
  }
});

test("transcribirConGemini: devuelve null si Gemini devuelve respuesta sin contenido", async (t) => {
  t.mock.method(global, "fetch", async () => ({
    ok: true,
    json: async () => ({ candidates: [] }),
  }));

  const original = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "test-key";

  try {
    const result = await transcribirConGemini(Buffer.from("x"), "audio/webm");
    assert.equal(result, null);
  } finally {
    if (original !== undefined) process.env.GEMINI_API_KEY = original;
    else delete process.env.GEMINI_API_KEY;
  }
});

test("transcribirConGemini: nunca lanza excepción con fetch que tira", async (t) => {
  t.mock.method(global, "fetch", async () => {
    throw new Error("network down");
  });

  const original = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "test-key";

  try {
    const result = await transcribirConGemini(Buffer.from("x"), "audio/webm");
    assert.equal(result, null);
  } finally {
    if (original !== undefined) process.env.GEMINI_API_KEY = original;
    else delete process.env.GEMINI_API_KEY;
  }
});

test("transcribirConGemini: acepta audio vacío en transcripcion (cadena vacía) y devuelve transcript ''", async (t) => {
  t.mock.method(global, "fetch", async () => ({
    ok: true,
    json: async () => ({
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  transcripcion: "",
                  tipo: null,
                  severidad: null,
                  personasAfectadas: null,
                  resumen: "",
                  palabrasClaveDetectadas: [],
                  isInjured: false,
                  cannotMove: false,
                }),
              },
            ],
          },
        },
      ],
    }),
  }));

  const original = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "test-key";

  try {
    const result = await transcribirConGemini(Buffer.from("silence"), "audio/webm");
    assert.ok(result);
    assert.equal(result.transcript, "");
    assert.equal(result.provider, "gemini");
  } finally {
    if (original !== undefined) process.env.GEMINI_API_KEY = original;
    else delete process.env.GEMINI_API_KEY;
  }
});

// ---------------------------------------------------------------------------
// Tests: obtenerTranscript (orquestador de la cascada)
// ---------------------------------------------------------------------------

test("obtenerTranscript: si no hay buffer, devuelve {transcript:null, metodoTranscripcion:'ninguno'}", async () => {
  const result = await obtenerTranscript(Buffer.alloc(0), "audio/webm");
  assert.deepEqual(result, {
    transcript: null,
    rawInfo: null,
    metodoTranscripcion: "ninguno",
  });
});

test("obtenerTranscript: usa Gemini cuando Gemini responde correctamente", async (t) => {
  let fetchCalls = 0;
  t.mock.method(global, "fetch", async () => {
    fetchCalls += 1;
    return {
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    transcripcion: "necesito ayuda",
                    tipo: "medica",
                  }),
                },
              ],
            },
          },
        ],
      }),
    };
  });

  const original = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "test-key";

  try {
    const result = await obtenerTranscript(Buffer.from("audio"), "audio/webm");
    assert.equal(result.metodoTranscripcion, "gemini");
    assert.equal(result.transcript, "necesito ayuda");
    assert.equal(result.rawInfo.tipo, "medica");
    assert.equal(fetchCalls, 1);
  } finally {
    if (original !== undefined) process.env.GEMINI_API_KEY = original;
    else delete process.env.GEMINI_API_KEY;
  }
});

test("obtenerTranscript: si Gemini falla, devuelve 'ninguno' (registro para revisión manual)", async (t) => {
  t.mock.method(global, "fetch", async () => {
    throw new Error("network error");
  });

  const original = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "test-key";

  try {
    const result = await obtenerTranscript(Buffer.from("audio"), "audio/webm");
    assert.equal(result.metodoTranscripcion, "ninguno");
    assert.equal(result.transcript, null);
    assert.equal(result.rawInfo, null);
  } finally {
    if (original !== undefined) process.env.GEMINI_API_KEY = original;
    else delete process.env.GEMINI_API_KEY;
  }
});

test("obtenerTranscript: sin GEMINI_API_KEY devuelve 'ninguno'", async () => {
  const originalGemini = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  try {
    const result = await obtenerTranscript(Buffer.from("audio"), "audio/webm");
    assert.equal(result.metodoTranscripcion, "ninguno");
    assert.equal(result.transcript, null);
  } finally {
    if (originalGemini !== undefined) process.env.GEMINI_API_KEY = originalGemini;
  }
});

test("obtenerTranscript: si Gemini devuelve transcript vacío, devuelve 'ninguno'", async (t) => {
  // Caso real: Gemini responde OK pero no entendió el audio
  // (transcripcion === ""). El orquestador no debe usar un
  // transcript vacío como "éxito" — debe caer a 'ninguno' para que
  // el usuario complete el registro manualmente.
  t.mock.method(global, "fetch", async () => ({
    ok: true,
    json: async () => ({
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  transcripcion: "",
                  tipo: null,
                  resumen: "",
                }),
              },
            ],
          },
        },
      ],
    }),
  }));

  const original = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "test-key";

  try {
    const result = await obtenerTranscript(Buffer.from("silence"), "audio/webm");
    assert.equal(result.metodoTranscripcion, "ninguno");
    assert.equal(result.transcript, null);
  } finally {
    if (original !== undefined) process.env.GEMINI_API_KEY = original;
    else delete process.env.GEMINI_API_KEY;
  }
});

test("obtenerTranscript: nunca lanza excepción con buffer grande y sin key", async () => {
  const original = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  try {
    // No debe crashear ni con audio grande
    const big = Buffer.alloc(30 * 1024 * 1024, 0);
    const result = await obtenerTranscript(big, "audio/webm");
    assert.equal(result.metodoTranscripcion, "ninguno");
    assert.equal(result.transcript, null);
  } finally {
    if (original !== undefined) process.env.GEMINI_API_KEY = original;
  }
});
