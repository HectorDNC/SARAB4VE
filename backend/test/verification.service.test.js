process.env.APP_BASE_URL = "https://sara.example";

const test = require("node:test");
const assert = require("node:assert/strict");
const verificationService = require("../src/modules/verification/verification.service");
const emailService = require("../src/services/email.service");

function baseRepository(current, overrides = {}) {
  return {
    findVerificationById: async () => current,
    withTransaction: async (callback) => callback({ query: async () => ({ rows: [] }) }),
    updateVerificationStatus: async (_client, id, toStatus) => ({ id, status: toStatus }),
    insertStatusHistory: async () => {},
    approveUser: async () => {},
    rejectUser: async () => {},
    findVerificationOwnerContact: async () => ({
      id: current.id,
      ownerId: current.ownerId,
      ownerName: "María Pérez",
      ownerEmail: "maria@example.com",
    }),
    insertVerificationToken: async (_client, verificationRequestId, action) => ({
      id: "token-id-1",
      verificationRequestId,
      token: "550e8400-e29b-41d4-a716-446655440000",
      action,
    }),
    ...overrides,
  };
}

function mockSendEmail() {
  const originalSendEmail = emailService.sendEmail;
  const sent = [];
  emailService.sendEmail = async (to, subject, html) => {
    sent.push({ to, subject, html });
    return { accepted: [to] };
  };
  return {
    sent,
    restore: () => {
      emailService.sendEmail = originalSendEmail;
    },
  };
}

test("transitionVerification a 'aceptada' genera token completar_registro y envía el Correo 4A", async () => {
  const { sent, restore } = mockSendEmail();
  const tokenCalls = [];

  try {
    const current = { id: 1, ownerId: "owner-1", status: "en_estudio" };
    const repository = baseRepository(current, {
      insertVerificationToken: async (_client, verificationRequestId, action) => {
        tokenCalls.push({ verificationRequestId, action });
        return { id: "token-id-1", verificationRequestId, token: "550e8400-e29b-41d4-a716-446655440000", action };
      },
    });

    const result = await verificationService.transitionVerification(
      1, { toStatus: "aceptada" }, "reviewer-1", repository,
    );

    assert.equal(result.data.status, "aceptada");
    assert.equal(tokenCalls.length, 1);
    assert.equal(tokenCalls[0].action, "completar_registro");
    assert.equal(sent.length, 1);
    assert.equal(sent[0].to, "maria@example.com");
    assert.match(sent[0].subject, /aceptada/i);
    assert.match(sent[0].html, /completar-registro\?token=550e8400-e29b-41d4-a716-446655440000/);
  } finally {
    restore();
  }
});

test("transitionVerification a 'rechazada' envía el Correo 4B con el motivo, sin generar token", async () => {
  const { sent, restore } = mockSendEmail();
  let tokenCalled = false;

  try {
    const current = { id: 2, ownerId: "owner-2", status: "en_estudio" };
    const repository = baseRepository(current, {
      insertVerificationToken: async () => {
        tokenCalled = true;
      },
    });

    await verificationService.transitionVerification(
      2, { toStatus: "rechazada", reason: "Documentación incompleta" }, "reviewer-1", repository,
    );

    assert.equal(tokenCalled, false);
    assert.equal(sent.length, 1);
    assert.match(sent[0].html, /Documentación incompleta/);
  } finally {
    restore();
  }
});

test("transitionVerification a 'en_estudio' envía el Correo 3", async () => {
  const { sent, restore } = mockSendEmail();

  try {
    const current = { id: 3, ownerId: "owner-3", status: "entregada" };
    const repository = baseRepository(current);

    await verificationService.transitionVerification(
      3, { toStatus: "en_estudio" }, "reviewer-1", repository,
    );

    assert.equal(sent.length, 1);
    assert.match(sent[0].subject, /en revisión/i);
  } finally {
    restore();
  }
});

test("transitionVerification no revierte la transición si falla el envío del correo", async () => {
  const originalSendEmail = emailService.sendEmail;
  const originalConsoleError = console.error;
  emailService.sendEmail = async () => {
    throw new Error("SMTP caído");
  };
  console.error = () => {};

  try {
    const current = { id: 4, ownerId: "owner-4", status: "en_estudio" };
    const repository = baseRepository(current);

    const result = await verificationService.transitionVerification(
      4, { toStatus: "aceptada" }, "reviewer-1", repository,
    );

    assert.equal(result.data.status, "aceptada");
  } finally {
    emailService.sendEmail = originalSendEmail;
    console.error = originalConsoleError;
  }
});
