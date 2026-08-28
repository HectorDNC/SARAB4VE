const test = require("node:test");
const assert = require("node:assert/strict");
const db = require("../src/db");
const repository = require("../src/modules/verification/verification.repository");

test("listVerifications soporta search, limit, offset y sigue filtrando status/entityType", async () => {
  const originalQuery = db.query;
  const queries = [];

  db.query = async (text, params) => {
    queries.push({ text, params });

    if (queries.length === 1) {
      assert.ok(text.includes("LIMIT"), "La consulta de datos debe incluir LIMIT");
      assert.ok(text.includes("OFFSET"), "La consulta de datos debe incluir OFFSET");
      assert.deepEqual(params, [
        "en_estudio",
        "organization",
        "%maria%",
        20,
        10,
      ]);
      return {
        rows: [
          {
            id: 1,
            ownerId: "550e8400-e29b-41d4-a716-446655440000",
            entityType: "organization",
            status: "en_estudio",
            rejectionReason: null,
            submittedAt: "2026-08-10T00:00:00.000Z",
            reviewedBy: null,
            reviewedAt: null,
            ownerName: "María Pérez",
            ownerEmail: "maria@example.com",
          },
        ],
      };
    }

    if (queries.length === 2) {
      assert.ok(text.includes("COUNT(*)::int AS total"), "La consulta de conteo debe incluir COUNT(*)");
      assert.deepEqual(params, ["en_estudio", "organization", "%maria%"]);
      return { rows: [{ total: 123 }] };
    }

    throw new Error("Se ejecutó una query inesperada");
  };

  try {
    const result = await repository.listVerificationsPaginated(
      "en_estudio",
      "organization",
      "maria",
      20,
      10,
    );

    assert.equal(result.total, 123);
    assert.equal(result.limit, 20);
    assert.equal(result.offset, 10);
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].ownerName, "María Pérez");
    assert.equal(result.items[0].ownerEmail, "maria@example.com");
  } finally {
    db.query = originalQuery;
  }
});

test("listVerifications aplica default limit 50 y offset 0 cuando no se envían", async () => {
  const originalQuery = db.query;
  let callIndex = 0;

  db.query = async (text, params) => {
    callIndex += 1;

    if (callIndex === 1) {
      assert.ok(text.includes("LIMIT"), "La consulta de datos debe incluir LIMIT");
      assert.ok(text.includes("OFFSET"), "La consulta de datos debe incluir OFFSET");
      assert.deepEqual(params.slice(-2), [50, 0]);
      return { rows: [] };
    }

    if (callIndex === 2) {
      assert.ok(text.includes("COUNT(*)::int AS total"), "La consulta de conteo debe incluir COUNT(*)");
      return { rows: [{ total: 0 }] };
    }

    throw new Error("Se ejecutó una query inesperada");
  };

  try {
    const result = await repository.listVerificationsPaginated("rechazada", "volunteer_professional");
    assert.equal(result.limit, 50);
    assert.equal(result.offset, 0);
    assert.equal(result.total, 0);
    assert.deepEqual(result.items, []);
  } finally {
    db.query = originalQuery;
  }
});
