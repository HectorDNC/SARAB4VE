const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret";

const app = require("../src/app");
const authService = require("../src/modules/auth/auth.service");
const verificationService = require("../src/modules/verification/verification.service");

function request(server, method, path, body, headers = {}) {
  const address = server.address();
  const payload = body ? JSON.stringify(body) : null;

  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: address.port,
        method,
        path,
        headers: {
          ...headers,
          ...(payload
            ? {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(payload),
              }
            : {}),
        },
      },
      (res) => {
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            resolve({
              statusCode: res.statusCode,
              body: data ? JSON.parse(data) : null,
            });
          } catch (err) {
            reject(err);
          }
        });
      },
    );

    req.on("error", reject);

    if (payload) {
      req.write(payload);
    }

    req.end();
  });
}

test("GET /api/admin/verifications/paginated returns paginated admin verification data with valid admin token", async () => {
  const originalList = verificationService.listAdminVerificationsPaginated;

  verificationService.listAdminVerificationsPaginated = async (query) => {
    assert.deepEqual(query, {
      status: "en_estudio",
      entityType: "organization",
      search: "maria",
      limit: 20,
      offset: 10,
    });

    return {
      data: {
        items: [
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
        total: 1,
        limit: 20,
        offset: 10,
      },
    };
  };

  const adminToken = authService.issueToken({
    id: "admin-id",
    role: "admin",
    status: "approved",
  });

  const server = app.listen(0);

  try {
    const response = await request(
      server,
      "GET",
      "/api/admin/verifications/paginated?status=en_estudio&entityType=organization&search=maria&limit=20&offset=10",
      null,
      {
        Authorization: `Bearer ${adminToken}`,
      },
    );

    assert.equal(response.statusCode, 200);
    assert.ok(Array.isArray(response.body.data.items));
    assert.equal(response.body.data.total, 1);
    assert.equal(response.body.data.limit, 20);
    assert.equal(response.body.data.offset, 10);
    assert.equal(response.body.data.items[0].ownerName, "María Pérez");
    assert.equal(response.body.data.items[0].ownerEmail, "maria@example.com");
  } finally {
    verificationService.listAdminVerificationsPaginated = originalList;
    await new Promise((resolve) => server.close(resolve));
  }
});
