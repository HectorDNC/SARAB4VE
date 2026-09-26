const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const jwt = require("jsonwebtoken");

process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://test:test@localhost:5432/test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";

const app = require("../src/app");
const db = require("../src/db");

function tokenFor(role) {
  return jwt.sign(
    { userId: "550e8400-e29b-41d4-a716-446655440000", role, status: "approved" },
    process.env.JWT_SECRET,
  );
}

function request(server, path, token) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: server.address().port,
        method: "GET",
        path,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
      (res) => {
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          resolve({ statusCode: res.statusCode, body: data ? JSON.parse(data) : null });
        });
      },
    );
    req.on("error", reject);
    req.end();
  });
}

async function withServer(queryImpl, fn) {
  const originalQuery = db.query;
  const calls = [];
  db.query = async (sql, values) => {
    calls.push(sql);
    return queryImpl(sql, values);
  };
  const server = app.listen(0);
  try {
    await fn(server, calls);
  } finally {
    db.query = originalQuery;
    await new Promise((resolve) => server.close(resolve));
  }
}

const ENDPOINTS = [
  {
    path: "/api/help-requests/stats",
    table: "help_requests",
    rows: [
      { status: "open", count: 4 },
      { status: "resolved", count: 2 },
    ],
    expected: { total: 6, open: 4, assigned: 0, resolved: 2 },
    empty: { total: 0, open: 0, assigned: 0, resolved: 0 },
  },
  {
    path: "/api/emergencies/stats",
    table: "emergencies",
    rows: [
      { status: "received", count: 3 },
      { status: "assigned", count: 1 },
    ],
    expected: { total: 4, received: 3, assigned: 1, resolved: 0 },
    empty: { total: 0, received: 0, assigned: 0, resolved: 0 },
  },
];

for (const endpoint of ENDPOINTS) {
  test(`${endpoint.path} returns counts grouped by status`, async () => {
    await withServer(async () => ({ rows: endpoint.rows }), async (server, calls) => {
      const response = await request(server, endpoint.path, tokenFor("volunteer"));

      assert.equal(response.statusCode, 200);
      assert.deepEqual(response.body, { data: endpoint.expected });
      assert.equal(calls.length, 1);
      assert.match(calls[0], new RegExp(`FROM ${endpoint.table}\\s+GROUP BY status`));
    });
  });

  test(`${endpoint.path} returns zeros (not blank) when there are no rows`, async () => {
    await withServer(async () => ({ rows: [] }), async (server) => {
      const response = await request(server, endpoint.path, tokenFor("organization"));

      assert.equal(response.statusCode, 200);
      assert.deepEqual(response.body, { data: endpoint.empty });
    });
  });

  test(`${endpoint.path} allows admin`, async () => {
    await withServer(async () => ({ rows: [] }), async (server) => {
      const response = await request(server, endpoint.path, tokenFor("admin"));
      assert.equal(response.statusCode, 200);
    });
  });

  test(`${endpoint.path} requires authentication`, async () => {
    await withServer(async () => {
      throw new Error("db should not be called");
    }, async (server, calls) => {
      const response = await request(server, endpoint.path);
      assert.equal(response.statusCode, 401);
      assert.equal(calls.length, 0);
    });
  });

  test(`${endpoint.path} rejects citizen role`, async () => {
    await withServer(async () => {
      throw new Error("db should not be called");
    }, async (server, calls) => {
      const response = await request(server, endpoint.path, tokenFor("citizen"));
      assert.equal(response.statusCode, 403);
      assert.equal(calls.length, 0);
    });
  });
}
