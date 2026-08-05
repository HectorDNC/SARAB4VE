/**
 * Tests unitarios — Máquina de estados del flujo de verificación.
 *
 * Cubre:
 *   1. Transiciones válidas (todas las rutas del grafo)
 *   2. Transiciones inválidas (rechazadas por la máquina)
 *   3. Estados no reconocidos
 *   4. Estado final (aceptada) sin salidas
 *   5. Función pura — sin dependencias de base de datos
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  STATE_MACHINE,
  validateTransition,
  isTerminalStatus,
} = require("../src/modules/verification/verification.service");

// ---------------------------------------------------------------------------
// 1. STATE_MACHINE — estructura inmutable
// ---------------------------------------------------------------------------

test("STATE_MACHINE is frozen (immutable)", () => {
  assert.equal(Object.isFrozen(STATE_MACHINE), true);
  for (const [status, allowed] of Object.entries(STATE_MACHINE)) {
    assert.equal(
      Object.isFrozen(allowed),
      true,
      `Transitions for "${status}" should be frozen`,
    );
  }
});

test("STATE_MACHINE contains all expected statuses", () => {
  const expected = ["entregada", "en_estudio", "rechazada", "aceptada"];
  const actual = Object.keys(STATE_MACHINE).sort();
  assert.deepEqual(actual, expected.sort());
});

// ---------------------------------------------------------------------------
// 2. Transiciones VÁLIDAS
// ---------------------------------------------------------------------------

test("entregada → en_estudio is valid", () => {
  const result = validateTransition("entregada", "en_estudio");
  assert.equal(result.valid, true);
  assert.equal(result.error, undefined);
});

test("en_estudio → aceptada is valid", () => {
  const result = validateTransition("en_estudio", "aceptada");
  assert.equal(result.valid, true);
});

test("en_estudio → rechazada is valid", () => {
  const result = validateTransition("en_estudio", "rechazada");
  assert.equal(result.valid, true);
});

test("rechazada → entregada (reenvío) is valid", () => {
  const result = validateTransition("rechazada", "entregada");
  assert.equal(result.valid, true);
});

// ---------------------------------------------------------------------------
// 3. Transiciones INVÁLIDAS
// ---------------------------------------------------------------------------

test("entregada → aceptada is NOT allowed (must pass through en_estudio)", () => {
  const result = validateTransition("entregada", "aceptada");
  assert.equal(result.valid, false);
  assert.ok(result.error.includes("no permitida"));
  assert.ok(result.error.includes("en_estudio"));
});

test("entregada → rechazada is NOT allowed", () => {
  const result = validateTransition("entregada", "rechazada");
  assert.equal(result.valid, false);
  assert.ok(result.error.includes("no permitida"));
});

test("en_estudio → entregada is NOT allowed (no retroceso directo)", () => {
  const result = validateTransition("en_estudio", "entregada");
  assert.equal(result.valid, false);
});

test("rechazada → aceptada is NOT allowed (must go through entregada → en_estudio)", () => {
  const result = validateTransition("rechazada", "aceptada");
  assert.equal(result.valid, false);
});

test("rechazada → en_estudio is NOT allowed (must go through entregada first)", () => {
  const result = validateTransition("rechazada", "en_estudio");
  assert.equal(result.valid, false);
});

test("aceptada → * (any) is NOT allowed (terminal state)", () => {
  const result = validateTransition("aceptada", "entregada");
  assert.equal(result.valid, false);
  assert.ok(result.error.includes("estado final"));
});

test("aceptada → en_estudio is NOT allowed", () => {
  const result = validateTransition("aceptada", "en_estudio");
  assert.equal(result.valid, false);
});

test("aceptada → rechazada is NOT allowed", () => {
  const result = validateTransition("aceptada", "rechazada");
  assert.equal(result.valid, false);
});

// ---------------------------------------------------------------------------
// 4. Ciclo completo: entregada → en_estudio → rechazada → entregada → en_estudio → aceptada
// ---------------------------------------------------------------------------

test("ciclo completo con reenvío es válido paso a paso", () => {
  // Paso 1: entregada → en_estudio
  let result = validateTransition("entregada", "en_estudio");
  assert.equal(result.valid, true);

  // Paso 2: en_estudio → rechazada
  result = validateTransition("en_estudio", "rechazada");
  assert.equal(result.valid, true);

  // Paso 3: rechazada → entregada (reenvío)
  result = validateTransition("rechazada", "entregada");
  assert.equal(result.valid, true);

  // Paso 4: entregada → en_estudio (segunda revisión)
  result = validateTransition("entregada", "en_estudio");
  assert.equal(result.valid, true);

  // Paso 5: en_estudio → aceptada
  result = validateTransition("en_estudio", "aceptada");
  assert.equal(result.valid, true);

  // Paso 6: aceptada es terminal
  assert.equal(isTerminalStatus("aceptada"), true);
});

// ---------------------------------------------------------------------------
// 5. Estados no reconocidos
// ---------------------------------------------------------------------------

test("unknown fromStatus returns invalid", () => {
  const result = validateTransition("estado_inventado", "entregada");
  assert.equal(result.valid, false);
  assert.ok(result.error.includes("no reconocido"));
});

test("unknown toStatus on valid from throws because not in allowed list", () => {
  const result = validateTransition("entregada", "estado_inventado");
  assert.equal(result.valid, false);
  assert.ok(result.error.includes("no permitida"));
});

// ---------------------------------------------------------------------------
// 6. isTerminalStatus
// ---------------------------------------------------------------------------

test("aceptada is terminal", () => {
  assert.equal(isTerminalStatus("aceptada"), true);
});

test("entregada is NOT terminal", () => {
  assert.equal(isTerminalStatus("entregada"), false);
});

test("en_estudio is NOT terminal", () => {
  assert.equal(isTerminalStatus("en_estudio"), false);
});

test("rechazada is NOT terminal", () => {
  assert.equal(isTerminalStatus("rechazada"), false);
});

test("unknown status is NOT terminal (returns false)", () => {
  assert.equal(isTerminalStatus("estado_inventado"), false);
});

// ---------------------------------------------------------------------------
// 7. Mensajes de error contienen las transiciones permitidas
// ---------------------------------------------------------------------------

test("error message lists allowed transitions from current state", () => {
  const result = validateTransition("entregada", "rechazada");
  assert.ok(result.error.includes("en_estudio"), "Should mention the only valid transition: en_estudio");
  // El mensaje menciona "rechazada" porque es el toStatus que se intentó, no como permitida.
  // Verificamos que diga "no permitida" y liste "en_estudio".
  assert.ok(result.error.includes("no permitida"), "Should say not allowed");
});

test("error message for terminal state says 'ninguna (estado final)'", () => {
  const result = validateTransition("aceptada", "entregada");
  assert.ok(
    result.error.includes("ninguna") || result.error.includes("estado final"),
    "Terminal state message should indicate no transitions",
  );
});

// ---------------------------------------------------------------------------
// 8. Validación de integridad del mapa
// ---------------------------------------------------------------------------

test("every status in STATE_MACHINE has a defined allowed array", () => {
  for (const status of Object.keys(STATE_MACHINE)) {
    const allowed = STATE_MACHINE[status];
    assert.ok(Array.isArray(allowed), `"${status}" should map to an array`);
  }
});

test("all allowed transitions are known statuses", () => {
  const known = new Set(Object.keys(STATE_MACHINE));
  for (const [from, allowed] of Object.entries(STATE_MACHINE)) {
    for (const to of allowed) {
      assert.ok(
        known.has(to),
        `Transition "${from}" → "${to}" references unknown status`,
      );
    }
  }
});
