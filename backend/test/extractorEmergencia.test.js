/**
 * Tests unitarios para el módulo extractorEmergencia.
 *
 * Cubre:
 * - Clasificación por diccionario de palabras clave (offline)
 * - Extracción vía Google AI Studio / Gemini (con mocks)
 * - Extracción vía Groq (con mocks, fallback)
 * - Orquestador en cascada
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  clasificarPorPalabrasClave,
  extraerConIA,
  extraerConGemini,
  extraerConGroq,
  extraerInformacionEmergencia,
  InfoEmergenciaSchema,
  _internal,
} = require("../src/modules/emergencies/extractorEmergencia");

// ---------------------------------------------------------------------------
// Tests: Utilidades internas
// ---------------------------------------------------------------------------

test("normalize: remueve tildes, minúsculas y limpia caracteres especiales", () => {
  assert.equal(_internal.normalize("¡INCENDIO! ¿Qué pasó?"), "incendio que paso");
  assert.equal(_internal.normalize("Inundación"), "inundacion");
  assert.equal(_internal.normalize("MÉDICA"), "medica");
});

test("stripMarkdownCodeBlocks: remueve bloques de código markdown", () => {
  const input = '```json\n{"tipo": "incendio"}\n```';
  assert.equal(_internal.stripMarkdownCodeBlocks(input), '{"tipo": "incendio"}');

  const input2 = '```\n{"tipo": "medica"}\n```';
  assert.equal(_internal.stripMarkdownCodeBlocks(input2), '{"tipo": "medica"}');

  const input3 = '{"tipo": "inundacion"}';
  assert.equal(_internal.stripMarkdownCodeBlocks(input3), '{"tipo": "inundacion"}');

  const input4 = '```json\n{\n  "tipo": "violencia",\n  "severidad": "alta"\n}\n```';
  assert.equal(_internal.stripMarkdownCodeBlocks(input4), '{\n  "tipo": "violencia",\n  "severidad": "alta"\n}');
});

test("extractJSON: extrae el primer objeto JSON válido de un texto", () => {
  assert.equal(
    _internal.extractJSON('Texto antes {"tipo": "incendio", "severidad": "alta"} texto después'),
    '{"tipo": "incendio", "severidad": "alta"}'
  );
  assert.equal(
    _internal.extractJSON('```json\n{"tipo": "medica"}\n```'),
    '{"tipo": "medica"}'
  );
  assert.equal(_internal.extractJSON("sin json aqui"), null);
});

// ---------------------------------------------------------------------------
// Tests: InfoEmergenciaSchema (Zod)
// ---------------------------------------------------------------------------

test("InfoEmergenciaSchema: acepta objeto válido completo", () => {
  const result = InfoEmergenciaSchema.safeParse({
    tipo: "incendio",
    severidad: "alta",
    personasAfectadas: 3,
    resumen: "Incendio en edificio residencial",
    palabrasClaveDetectadas: ["fuego", "humo"],
  });
  assert.equal(result.success, true);
});

test("InfoEmergenciaSchema: acepta valores null", () => {
  const result = InfoEmergenciaSchema.safeParse({
    tipo: null,
    severidad: null,
    personasAfectadas: null,
    resumen: "Reporte sin clasificación clara",
    palabrasClaveDetectadas: [],
  });
  assert.equal(result.success, true);
});

test("InfoEmergenciaSchema: rechaza tipo inválido", () => {
  const result = InfoEmergenciaSchema.safeParse({
    tipo: "terremoto", // no está en el enum
    severidad: "alta",
    personasAfectadas: 5,
    resumen: "Terremoto detectado",
    palabrasClaveDetectadas: ["sismo"],
  });
  assert.equal(result.success, false);
});

// ---------------------------------------------------------------------------
// Tests: clasificarPorPalabrasClave (fallback offline)
// ---------------------------------------------------------------------------

test("clasificarPorPalabrasClave: detecta incendio con palabra clave", () => {
  const result = clasificarPorPalabrasClave("Hay un incendio en el edificio");
  assert.equal(result.tipo, "incendio");
  assert.ok(result.palabrasClaveDetectadas.length > 0);
});

test("clasificarPorPalabrasClave: detecta incendio con variante venezolana 'candela'", () => {
  const result = clasificarPorPalabrasClave("Se prendió candela en la casa");
  assert.equal(result.tipo, "incendio");
  assert.ok(result.palabrasClaveDetectadas.includes("candela"));
});

test("clasificarPorPalabrasClave: detecta emergencia médica", () => {
  const result = clasificarPorPalabrasClave(
    "Hay un herido sangrando mucho, necesitamos un médico urgente"
  );
  assert.equal(result.tipo, "medica");
  assert.equal(result.personasAfectadas, 1);
  assert.ok(result.palabrasClaveDetectadas.some((kw) => ["herido", "sangrando", "medico"].includes(kw)));
});

test("clasificarPorPalabrasClave: detecta inundación", () => {
  const result = clasificarPorPalabrasClave(
    "El río se desbordó, hay inundación en varias casas"
  );
  assert.equal(result.tipo, "inundacion");
  assert.ok(result.palabrasClaveDetectadas.some((kw) => ["inundacion", "desborde"].includes(kw)));
});

test("clasificarPorPalabrasClave: detecta violencia", () => {
  const result = clasificarPorPalabrasClave(
    "Hay una pelea con armas de fuego, escuché disparos"
  );
  assert.equal(result.tipo, "violencia");
  assert.ok(result.palabrasClaveDetectadas.some((kw) => ["pelea", "disparos", "arma"].includes(kw)));
});

test("clasificarPorPalabrasClave: detecta problema estructural", () => {
  const result = clasificarPorPalabrasClave(
    "El edificio tiene grietas grandes en las paredes, puede colapsar"
  );
  assert.equal(result.tipo, "estructural");
  assert.ok(result.palabrasClaveDetectadas.some((kw) => ["grietas", "colapso"].includes(kw)));
});

test("clasificarPorPalabrasClave: detecta múltiples personas afectadas", () => {
  const result = clasificarPorPalabrasClave(
    "Hay 5 personas heridas después del accidente"
  );
  assert.equal(result.personasAfectadas, 5);
});

test("clasificarPorPalabrasClave: devuelve 'otro' si no detecta nada específico", () => {
  const result = clasificarPorPalabrasClave(
    "Necesitamos ayuda para mover unos muebles"
  );
  assert.equal(result.tipo, "otro");
  assert.equal(result.severidad, null);
});

test("clasificarPorPalabrasClave: normaliza tildes y mayúsculas", () => {
  const result = clasificarPorPalabrasClave("¡INUNDACIÓN! El agua subió mucho");
  assert.equal(result.tipo, "inundacion");
});

test("clasificarPorPalabrasClave: nunca lanza excepción con input vacío", () => {
  const result = clasificarPorPalabrasClave("");
  assert.equal(result.tipo, "otro");
  assert.equal(result.resumen, "");
});

// ---------------------------------------------------------------------------
// Tests: extraerConGemini (nivel 1A — Google AI Studio)
// ---------------------------------------------------------------------------

test("extraerConGemini: devuelve null si GEMINI_API_KEY no está configurada", async () => {
  const originalKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  const result = await extraerConGemini("Hay un incendio");
  assert.equal(result, null);

  if (originalKey !== undefined) {
    process.env.GEMINI_API_KEY = originalKey;
  }
});

// Nota: Los tests con llamadas reales a Gemini requieren API key configurada.
// Para CI/CD, usar mocks o skip si no hay key disponible.

test("extraerConGemini: parsea JSON válido de respuesta mock", async (t) => {
  t.mock.method(global, "fetch", async () => ({
    ok: true,
    json: async () => ({
      candidates: [{
        content: {
          parts: [{
            text: JSON.stringify({
              tipo: "incendio",
              severidad: "alta",
              personasAfectadas: 2,
              resumen: "Incendio en edificio",
              palabrasClaveDetectadas: ["fuego", "humo"],
            }),
          }],
        },
      }],
    }),
  }));

  const originalKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "test-key-mock";

  try {
    const result = await extraerConGemini("Hay fuego y humo en el edificio");
    assert.equal(result.tipo, "incendio");
    assert.equal(result.severidad, "alta");
    assert.equal(result.personasAfectadas, 2);
  } finally {
    if (originalKey !== undefined) {
      process.env.GEMINI_API_KEY = originalKey;
    } else {
      delete process.env.GEMINI_API_KEY;
    }
  }
});

test("extraerConGemini: parsea JSON envuelto en bloque markdown", async (t) => {
  t.mock.method(global, "fetch", async () => ({
    ok: true,
    json: async () => ({
      candidates: [{
        content: {
          parts: [{
            text: '```json\n{\n  "tipo": "medica",\n  "severidad": "alta",\n  "personasAfectadas": 1,\n  "resumen": "Persona herida",\n  "palabrasClaveDetectadas": ["herida"]\n}\n```',
          }],
        },
      }],
    }),
  }));

  const originalKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "test-key-mock";

  try {
    const result = await extraerConGemini("Hay una persona herida grave");
    assert.equal(result.tipo, "medica");
    assert.equal(result.severidad, "alta");
    assert.equal(result.personasAfectadas, 1);
  } finally {
    if (originalKey !== undefined) {
      process.env.GEMINI_API_KEY = originalKey;
    } else {
      delete process.env.GEMINI_API_KEY;
    }
  }
});

test("extraerConGemini: devuelve null si Gemini responde JSON inválido", async (t) => {
  t.mock.method(global, "fetch", async () => ({
    ok: true,
    json: async () => ({
      candidates: [{
        content: {
          parts: [{ text: "Esto no es JSON válido {" }],
        },
      }],
    }),
  }));

  const originalKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "test-key-mock";

  try {
    const result = await extraerConGemini("Transcript de prueba");
    assert.equal(result, null);
  } finally {
    if (originalKey !== undefined) {
      process.env.GEMINI_API_KEY = originalKey;
    } else {
      delete process.env.GEMINI_API_KEY;
    }
  }
});

test("extraerConGemini: devuelve null si Gemini responde con error HTTP", async (t) => {
  t.mock.method(global, "fetch", async () => ({
    ok: false,
    status: 500,
    statusText: "Internal Server Error",
    text: async () => "Error interno",
  }));

  const originalKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "test-key-mock";

  try {
    const result = await extraerConGemini("Transcript de prueba");
    assert.equal(result, null);
  } finally {
    if (originalKey !== undefined) {
      process.env.GEMINI_API_KEY = originalKey;
    } else {
      delete process.env.GEMINI_API_KEY;
    }
  }
});

// ---------------------------------------------------------------------------
// Tests: extraerConGroq (nivel 1B — Groq fallback)
// ---------------------------------------------------------------------------

test("extraerConGroq: devuelve null si GROQ_API_KEY no está configurada", async () => {
  const originalKey = process.env.GROQ_API_KEY;
  delete process.env.GROQ_API_KEY;

  const result = await extraerConGroq("Hay un incendio");
  assert.equal(result, null);

  if (originalKey !== undefined) {
    process.env.GROQ_API_KEY = originalKey;
  }
});

// Nota: Los tests con llamadas reales a Groq requieren API key configurada.
// Para CI/CD, usar mocks o skip si no hay key disponible.

test("extraerConGroq: parsea JSON válido de respuesta mock", async (t) => {
  t.mock.method(global, "fetch", async () => ({
    ok: true,
    json: async () => ({
      choices: [{
        message: {
          content: JSON.stringify({
            tipo: "incendio",
            severidad: "alta",
            personasAfectadas: 2,
            resumen: "Incendio en edificio",
            palabrasClaveDetectadas: ["fuego", "humo"],
          }),
        },
      }],
    }),
  }));

  const originalKey = process.env.GROQ_API_KEY;
  process.env.GROQ_API_KEY = "test-key-mock";

  try {
    const result = await extraerConGroq("Hay fuego y humo en el edificio");
    assert.equal(result.tipo, "incendio");
    assert.equal(result.severidad, "alta");
    assert.equal(result.personasAfectadas, 2);
  } finally {
    if (originalKey !== undefined) {
      process.env.GROQ_API_KEY = originalKey;
    } else {
      delete process.env.GROQ_API_KEY;
    }
  }
});

test("extraerConGroq: devuelve null si Groq responde JSON inválido", async (t) => {
  t.mock.method(global, "fetch", async () => ({
    ok: true,
    json: async () => ({
      choices: [{
        message: {
          content: "Esto no es JSON válido {",
        },
      }],
    }),
  }));

  const originalKey = process.env.GROQ_API_KEY;
  process.env.GROQ_API_KEY = "test-key-mock";

  try {
    const result = await extraerConGroq("Transcript de prueba");
    assert.equal(result, null);
  } finally {
    if (originalKey !== undefined) {
      process.env.GROQ_API_KEY = originalKey;
    } else {
      delete process.env.GROQ_API_KEY;
    }
  }
});

test("extraerConGroq: devuelve null si Groq responde con error HTTP", async (t) => {
  t.mock.method(global, "fetch", async () => ({
    ok: false,
    status: 500,
    statusText: "Internal Server Error",
    text: async () => "Error interno",
  }));

  const originalKey = process.env.GROQ_API_KEY;
  process.env.GROQ_API_KEY = "test-key-mock";

  try {
    const result = await extraerConGroq("Transcript de prueba");
    assert.equal(result, null);
  } finally {
    if (originalKey !== undefined) {
      process.env.GROQ_API_KEY = originalKey;
    } else {
      delete process.env.GROQ_API_KEY;
    }
  }
});

// ---------------------------------------------------------------------------
// Tests: extraerConIA (orquesta Gemini primero, luego Groq)
// ---------------------------------------------------------------------------

test("extraerConIA: devuelve null si no hay ninguna API key configurada", async () => {
  const originalGeminiKey = process.env.GEMINI_API_KEY;
  const originalGroqKey = process.env.GROQ_API_KEY;
  delete process.env.GEMINI_API_KEY;
  delete process.env.GROQ_API_KEY;

  const result = await extraerConIA("Hay un incendio");
  assert.equal(result, null);

  if (originalGeminiKey !== undefined) {
    process.env.GEMINI_API_KEY = originalGeminiKey;
  }
  if (originalGroqKey !== undefined) {
    process.env.GROQ_API_KEY = originalGroqKey;
  }
});

test("extraerConIA: usa Gemini primero si ambas API keys están configuradas", async (t) => {
  t.mock.method(global, "fetch", async () => ({
    ok: true,
    json: async () => ({
      candidates: [{
        content: {
          parts: [{
            text: JSON.stringify({
              tipo: "violencia",
              severidad: "alta",
              personasAfectadas: 1,
              resumen: "Pelea con armas",
              palabrasClaveDetectadas: ["pelea", "arma"],
            }),
          }],
        },
      }],
    }),
  }));

  const originalGeminiKey = process.env.GEMINI_API_KEY;
  const originalGroqKey = process.env.GROQ_API_KEY;
  process.env.GEMINI_API_KEY = "gemini-test-key";
  process.env.GROQ_API_KEY = "groq-test-key";

  try {
    const result = await extraerConIA("Hay una pelea con armas");
    assert.equal(result.tipo, "violencia");
    assert.equal(result.personasAfectadas, 1);
  } finally {
    if (originalGeminiKey !== undefined) {
      process.env.GEMINI_API_KEY = originalGeminiKey;
    } else {
      delete process.env.GEMINI_API_KEY;
    }
    if (originalGroqKey !== undefined) {
      process.env.GROQ_API_KEY = originalGroqKey;
    } else {
      delete process.env.GROQ_API_KEY;
    }
  }
});

test("extraerConIA: cae a Groq si Gemini falla", async (t) => {
  t.mock.method(global, "fetch", async (url) => {
    if (typeof url === "string" && url.includes("generativelanguage.googleapis.com")) {
      return {
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        text: async () => "Gemini error",
      };
    }

    return {
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              tipo: "medica",
              severidad: "alta",
              personasAfectadas: 1,
              resumen: "Persona herida",
              palabrasClaveDetectadas: ["herida"],
            }),
          },
        }],
      }),
    };
  });

  const originalGeminiKey = process.env.GEMINI_API_KEY;
  const originalGroqKey = process.env.GROQ_API_KEY;
  process.env.GEMINI_API_KEY = "gemini-test-key";
  process.env.GROQ_API_KEY = "groq-test-key";

  try {
    const result = await extraerConIA("Hay una persona herida");
    assert.equal(result.tipo, "medica");
    assert.equal(result.personasAfectadas, 1);
  } finally {
    if (originalGeminiKey !== undefined) {
      process.env.GEMINI_API_KEY = originalGeminiKey;
    } else {
      delete process.env.GEMINI_API_KEY;
    }
    if (originalGroqKey !== undefined) {
      process.env.GROQ_API_KEY = originalGroqKey;
    } else {
      delete process.env.GROQ_API_KEY;
    }
  }
});

// ---------------------------------------------------------------------------
// Tests: extraerInformacionEmergencia (orquestador en cascada)
// ---------------------------------------------------------------------------

test("extraerInformacionEmergencia: usa diccionario si no hay API key", async () => {
  const originalGeminiKey = process.env.GEMINI_API_KEY;
  const originalGroqKey = process.env.GROQ_API_KEY;
  delete process.env.GEMINI_API_KEY;
  delete process.env.GROQ_API_KEY;

  try {
    const result = await extraerInformacionEmergencia("Hay un incendio grande");
    assert.equal(result.tipo, "incendio");
    assert.equal(result.metodoExtraccion, "diccionario");
  } finally {
    if (originalGeminiKey !== undefined) {
      process.env.GEMINI_API_KEY = originalGeminiKey;
    }
    if (originalGroqKey !== undefined) {
      process.env.GROQ_API_KEY = originalGroqKey;
    }
  }
});

test("extraerInformacionEmergencia: cae a diccionario si IA falla", async (t) => {
  t.mock.method(global, "fetch", async () => {
    throw new Error("Network error");
  });

  const originalGeminiKey = process.env.GEMINI_API_KEY;
  const originalGroqKey = process.env.GROQ_API_KEY;
  process.env.GEMINI_API_KEY = "gemini-test-key";
  process.env.GROQ_API_KEY = "groq-test-key";

  try {
    const result = await extraerInformacionEmergencia("Hay una persona herida");
    assert.equal(result.tipo, "medica");
    assert.equal(result.metodoExtraccion, "diccionario");
  } finally {
    if (originalGeminiKey !== undefined) {
      process.env.GEMINI_API_KEY = originalGeminiKey;
    } else {
      delete process.env.GEMINI_API_KEY;
    }
    if (originalGroqKey !== undefined) {
      process.env.GROQ_API_KEY = originalGroqKey;
    } else {
      delete process.env.GROQ_API_KEY;
    }
  }
});

test("extraerInformacionEmergencia: usa IA si responde correctamente", async (t) => {
  t.mock.method(global, "fetch", async () => ({
    ok: true,
    json: async () => ({
      candidates: [{
        content: {
          parts: [{
            text: JSON.stringify({
              tipo: "violencia",
              severidad: "alta",
              personasAfectadas: 1,
              resumen: "Pelea con armas",
              palabrasClaveDetectadas: ["pelea", "arma"],
            }),
          }],
        },
      }],
    }),
  }));

  const originalGeminiKey = process.env.GEMINI_API_KEY;
  const originalGroqKey = process.env.GROQ_API_KEY;
  process.env.GEMINI_API_KEY = "gemini-test-key";
  process.env.GROQ_API_KEY = "groq-test-key";

  try {
    const result = await extraerInformacionEmergencia("Hay una pelea con armas");
    assert.equal(result.tipo, "violencia");
    assert.equal(result.metodoExtraccion, "ia");
    assert.equal(result.personasAfectadas, 1);
  } finally {
    if (originalGeminiKey !== undefined) {
      process.env.GEMINI_API_KEY = originalGeminiKey;
    } else {
      delete process.env.GEMINI_API_KEY;
    }
    if (originalGroqKey !== undefined) {
      process.env.GROQ_API_KEY = originalGroqKey;
    } else {
      delete process.env.GROQ_API_KEY;
    }
  }
});

test("extraerInformacionEmergencia: maneja transcript vacío", async () => {
  const result = await extraerInformacionEmergencia("");
  assert.equal(result.tipo, "otro");
  assert.equal(result.metodoExtraccion, "diccionario");
  assert.equal(result.resumen, "");
});

test("extraerInformacionEmergencia: siempre incluye metodoExtraccion", async () => {
  const originalGeminiKey = process.env.GEMINI_API_KEY;
  const originalGroqKey = process.env.GROQ_API_KEY;
  delete process.env.GEMINI_API_KEY;
  delete process.env.GROQ_API_KEY;

  try {
    const result = await extraerInformacionEmergencia("Emergencia médica urgente");
    assert.ok("metodoExtraccion" in result);
    assert.ok(["ia", "diccionario"].includes(result.metodoExtraccion));
  } finally {
    if (originalGeminiKey !== undefined) {
      process.env.GEMINI_API_KEY = originalGeminiKey;
    }
    if (originalGroqKey !== undefined) {
      process.env.GROQ_API_KEY = originalGroqKey;
    }
  }
});
