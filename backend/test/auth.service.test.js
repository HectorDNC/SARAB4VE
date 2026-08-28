process.env.JWT_SECRET = "test-secret";
process.env.SMTP_HOST = "smtp.gmail.com";
process.env.SMTP_PORT = "587";
process.env.SMTP_USER = "sara.test@gmail.com";
process.env.SMTP_PASS = "app-password";
process.env.SMTP_FROM = "SARA <sara.test@gmail.com>";
process.env.VALIDATOR_EMAILS = "validador1@sara.org,validador2@sara.org";
process.env.APP_BASE_URL = "https://sara.example";

const test = require("node:test");
const assert = require("node:assert/strict");
const authService = require("../src/modules/auth/auth.service");
const emailService = require("../src/services/email.service");

test("registerVolunteer crea verification_request, genera token y envía los dos correos", async () => {
  const originalSendEmail = emailService.sendEmail;
  const sent = [];
  emailService.sendEmail = async (to, subject, html) => {
    sent.push({ to, subject, html });
    return { accepted: [to] };
  };

  const repository = {
    withTransaction: async (callback) => callback({
      query: async () => ({ rows: [] }),
    }),
    insertUser: async (_client, user) => ({
      id: "11111111-1111-4111-8111-111111111111",
      ...user,
      role: "volunteer",
      status: "pending",
    }),
    insertUserDetails: async () => ({
      skills: ["primeros_auxilios"],
      availableHours: 10,
      availableDays: ["lunes"],
    }),
    insertVerificationRequest: async (_client, ownerId, entityType) => ({
      id: 42,
      ownerId,
      entityType,
      status: "entregada",
    }),
    insertVerificationToken: async (_client, verificationRequestId, action) => ({
      id: "22222222-2222-4222-8222-222222222222",
      verificationRequestId,
      token: "33333333-3333-4333-8333-333333333333",
      action,
      createdAt: "2026-08-12T00:00:00.000Z",
      usedAt: null,
    }),
  };

  const schema = {
    normalizeRegisterVolunteer: () => ({
      user: {
        fullName: "Ana García",
        email: "voluntario@sara.org",
        phone: "+584241234567",
        password: "password123",
        role: "volunteer",
        status: "pending",
      },
      details: {
        skills: ["primeros_auxilios"],
        availableHours: 10,
        availableDays: ["lunes"],
        acceptedTerms: true,
      },
    }),
  };

  try {
    const result = await authService.registerVolunteer(
      {
        fullName: "Ana García",
        email: "voluntario@sara.org",
        phone: "+584241234567",
        password: "password123",
        skills: ["primeros_auxilios"],
        availableHours: 10,
        availableDays: ["lunes"],
        acceptedTerms: true,
      },
      schema,
      repository,
    );

    assert.equal(result.status, 201);
    assert.equal(sent.length, 2);
    assert.equal(sent[0].to, "voluntario@sara.org");
    assert.match(sent[0].subject, /Hemos recibido tu solicitud/);
    assert.match(sent[1].subject, /Nueva solicitud para revisar/);
    assert.match(sent[1].html, /iniciar_revision|link_iniciar_revision/i);
  } finally {
    emailService.sendEmail = originalSendEmail;
  }
});

test("registerOrganization no modifica la creación existente y sigue enviando los correos tras el commit", async () => {
  const originalSendEmail = emailService.sendEmail;
  const sent = [];
  emailService.sendEmail = async (to, subject, html) => {
    sent.push({ to, subject, html });
    return { accepted: [to] };
  };

  const repository = {
    withTransaction: async (callback) => {
      const created = await callback({ query: async () => ({ rows: [] }) });
      return {
        ...created,
        verification: {
          id: 77,
          ownerId: created.id,
          entityType: "organization",
          status: "entregada",
        },
      };
    },
    insertUser: async (_client, user) => ({
      id: "44444444-4444-4444-8444-444444444444",
      ...user,
      role: "organization",
      status: "pending",
    }),
    insertUserDetails: async () => ({
      organizationName: "Fundación SARA",
      legalDocument: "J-12345678-9",
      acceptedTerms: true,
    }),
    insertVerificationRequest: async (_client, ownerId, entityType) => ({
      id: 77,
      ownerId,
      entityType,
      status: "entregada",
    }),
    insertVerificationToken: async (_client, verificationRequestId, action) => ({
      id: "55555555-5555-4555-8555-555555555555",
      verificationRequestId,
      token: "66666666-6666-4666-8666-666666666666",
      action,
      createdAt: "2026-08-12T00:00:00.000Z",
      usedAt: null,
    }),
    insertOrganizationProfile: async () => ({ id: 1 }),
    insertLegalRepresentative: async () => ({ fullName: "Ana Pérez" }),
    insertOrganizationDisabilityType: async () => {},
    insertOrganizationService: async () => {},
  };

  const schema = {
    normalizeRegisterOrganizationExtended: () => ({
      user: {
        fullName: "Fundación SARA",
        email: "org@sara.org",
        phone: "+584241234567",
        password: "password123",
        role: "organization",
        status: "pending",
      },
      details: {
        organizationName: "Fundación SARA",
        legalDocument: "J-12345678-9",
        acceptedTerms: true,
      },
      profile: { organizationTypeId: 1 },
      legalRepresentatives: [{ fullName: "Ana Pérez" }],
      disabilityTypeIds: [1],
      serviceIds: [1],
    }),
    normalizeRegisterOrganization: () => ({
      user: {
        fullName: "Fundación SARA",
        email: "org@sara.org",
        phone: "+584241234567",
        password: "password123",
        role: "organization",
        status: "pending",
      },
      details: {
        organizationName: "Fundación SARA",
        legalDocument: "J-12345678-9",
        acceptedTerms: true,
      },
    }),
  };

  try {
    const result = await authService.registerOrganization(
      {
        fullName: "Fundación SARA",
        email: "org@sara.org",
        phone: "+584241234567",
        password: "password123",
        organizationName: "Fundación SARA",
        legalDocument: "J-12345678-9",
        acceptedTerms: true,
        organizationTypeId: 1,
        legalRepresentatives: [{ fullName: "Ana Pérez" }],
        disabilityTypeIds: [1],
        serviceIds: [1],
      },
      schema,
      repository,
    );

    assert.equal(result.status, 201);
    assert.equal(sent.length, 2);
    assert.equal(sent[0].to, "org@sara.org");
    assert.match(sent[0].subject, /Hemos recibido tu solicitud/);
    assert.match(sent[1].subject, /Nueva solicitud para revisar/);
  } finally {
    emailService.sendEmail = originalSendEmail;
  }
});

test("validateCompletionToken devuelve valid: true para un token utilizable", async () => {
  const repository = {
    findCompletionToken: async (token) => {
      assert.equal(token, "token-valido");
      return {
        tokenId: "token-id-1",
        usedAt: null,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        requestStatus: "aceptada",
        ownerId: "owner-1",
        ownerEmail: "owner@sara.org",
        ownerName: "Owner",
      };
    },
  };

  const result = await authService.validateCompletionToken("token-valido", repository);

  assert.deepEqual(result, { data: { valid: true, status: "aceptada" } });
});

test("validateCompletionToken devuelve valid: false sin distinguir el motivo (usado, expirado, inexistente, status incorrecto)", async () => {
  const baseRecord = {
    tokenId: "token-id-1",
    usedAt: null,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    requestStatus: "aceptada",
    ownerId: "owner-1",
    ownerEmail: "owner@sara.org",
    ownerName: "Owner",
  };

  const cases = [
    { ...baseRecord, usedAt: "2026-08-10T00:00:00.000Z" },
    { ...baseRecord, expiresAt: new Date(Date.now() - 60 * 60 * 1000).toISOString() },
    { ...baseRecord, requestStatus: "en_estudio" },
    null,
  ];

  for (const record of cases) {
    const repository = { findCompletionToken: async () => record };
    const result = await authService.validateCompletionToken("token", repository);
    assert.deepEqual(result, { data: { valid: false } });
  }
});

test("completeRegistration marca el token como usado y define la contraseña", async () => {
  const record = {
    tokenId: "token-id-1",
    usedAt: null,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    requestStatus: "aceptada",
    ownerId: "owner-1",
    ownerEmail: "owner@sara.org",
    ownerName: "Owner",
  };

  const calls = { marked: null, password: null };

  const repository = {
    findCompletionToken: async () => record,
    withTransaction: async (callback) => callback({ query: async () => ({ rows: [] }) }),
    markCompletionTokenUsed: async (_client, tokenId) => {
      calls.marked = tokenId;
      return { id: tokenId };
    },
    updateUserPassword: async (_client, userId, passwordHash) => {
      calls.password = { userId, passwordHash };
    },
  };

  const result = await authService.completeRegistration(
    { token: "token-valido", password: "nuevaClave123" },
    repository,
  );

  assert.deepEqual(result, { data: { completed: true } });
  assert.equal(calls.marked, "token-id-1");
  assert.equal(calls.password.userId, "owner-1");
  assert.notEqual(calls.password.passwordHash, "nuevaClave123");
});

test("completeRegistration rechaza con error genérico si el token ya fue usado (canje concurrente)", async () => {
  const record = {
    tokenId: "token-id-1",
    usedAt: null,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    requestStatus: "aceptada",
    ownerId: "owner-1",
    ownerEmail: "owner@sara.org",
    ownerName: "Owner",
  };

  const repository = {
    findCompletionToken: async () => record,
    withTransaction: async (callback) => callback({ query: async () => ({ rows: [] }) }),
    markCompletionTokenUsed: async () => null,
    updateUserPassword: async () => {
      throw new Error("no debería llamarse si el token ya fue consumido");
    },
  };

  const result = await authService.completeRegistration(
    { token: "token-valido", password: "nuevaClave123" },
    repository,
  );

  assert.equal(result.status, 400);
  assert.deepEqual(result.errors, ["El enlace no es válido o ya fue usado"]);
});

test("completeRegistration rechaza sin llegar a la transacción si el token no es utilizable", async () => {
  const repository = {
    findCompletionToken: async () => null,
    withTransaction: async () => {
      throw new Error("no debería abrir transacción si el token es inválido");
    },
  };

  const result = await authService.completeRegistration(
    { token: "token-inexistente", password: "nuevaClave123" },
    repository,
  );

  assert.equal(result.status, 400);
  assert.deepEqual(result.errors, ["El enlace no es válido o ya fue usado"]);
});
