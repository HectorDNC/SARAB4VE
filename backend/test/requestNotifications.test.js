const test = require("node:test");
const assert = require("node:assert/strict");

const repository = require("../src/modules/notifications/requestNotifications.repository");
const {
  EMERGENCY_DISABILITY_TO_CATALOG,
  resolveCatalogCategories,
} = require("../src/modules/notifications/emergencyCategories");
const {
  isUrgent,
  buildMatchedRequestEmail,
  buildRequesterConfirmationEmail,
} = require("../src/services/emailTemplates/requestEmails");
const { buildMapLink } = require("../src/modules/notifications/requestNotifications.service");

const BASE_PARAMS = {
  latitude: 10.4806,
  longitude: -66.9036,
  radiusKm: 10,
  categoryNames: ["Visual"],
  excludeUserId: "550e8400-e29b-41d4-a716-446655440000",
  limit: 200,
};

// ---------------------------------------------------------------------------
// Repository: forma del SQL
// ---------------------------------------------------------------------------

test("buildMatchingRecipientsQuery arma la consulta geo con gates y límite", () => {
  const { sql } = repository.buildMatchingRecipientsQuery(BASE_PARAMS);

  assert.ok(sql.includes("ST_DWithin"), "debe filtrar por radio con ST_DWithin");
  assert.ok(
    sql.includes("organization_disability_types"),
    "debe unir organization_disability_types para el match de organizaciones",
  );
  assert.ok(
    sql.includes("notify_new_requests"),
    "debe respetar la compuerta opt-in notify_new_requests",
  );
  assert.ok(sql.includes("LIMIT $6::int"), "debe limitar los destinatarios con LIMIT");
  assert.ok(
    sql.includes("ST_MakePoint($1::float8, $2::float8)"),
    "ST_MakePoint debe recibir longitud primero y latitud después",
  );
  assert.ok(
    sql.includes("ORDER BY u.role, u.id"),
    "el ORDER BY debe usar columnas presentes en el SELECT (seguro con DISTINCT)",
  );
});

test("buildMatchingRecipientsQuery usa categorías como un solo arreglo text[]", () => {
  const { sql } = repository.buildMatchingRecipientsQuery(BASE_PARAMS);

  assert.ok(
    sql.includes("cardinality($4::text[]) = 0"),
    "debe existir la rama sin filtro de categoría",
  );
  assert.ok(sql.includes("ANY($4::text[])"), "el match de categorías debe usar ANY(...::text[])");
});

test("buildMatchingRecipientsQuery ordena los parámetros: lng, lat, radio, categorías, excluir, límite", () => {
  const { values } = repository.buildMatchingRecipientsQuery(BASE_PARAMS);

  assert.equal(values.length, 6, "categorías debe viajar como UN solo parámetro");
  assert.ok(Array.isArray(values[3]), "el cuarto parámetro debe ser el arreglo de categorías");
  assert.deepEqual(values, [
    -66.9036,
    10.4806,
    10,
    ["Visual"],
    "550e8400-e29b-41d4-a716-446655440000",
    200,
  ]);
});

test("buildMatchingRecipientsQuery con arreglo de categorías vacío sigue siendo SQL válido (solo radio)", () => {
  const { sql, values } = repository.buildMatchingRecipientsQuery({
    ...BASE_PARAMS,
    categoryNames: [],
    excludeUserId: null,
  });

  assert.ok(
    sql.includes("cardinality($4::text[]) = 0"),
    "la rama de solo radio debe seguir presente",
  );
  assert.ok(sql.includes("$5::uuid IS NULL"), "debe existir la rama IS NULL para el excluido");
  assert.deepEqual(values, [BASE_PARAMS.longitude, BASE_PARAMS.latitude, 10, [], null, 200]);
});

// ---------------------------------------------------------------------------
// Mapeo de discapacidad de emergencias
// ---------------------------------------------------------------------------

test("resolveCatalogCategories mapea visual y auditiva uno a uno", () => {
  assert.deepEqual(resolveCatalogCategories("visual"), ["Visual"]);
  assert.deepEqual(resolveCatalogCategories("auditiva"), ["Auditiva"]);
});

test("resolveCatalogCategories expande las categorías paraguas neuro y motriz", () => {
  const neuro = resolveCatalogCategories("neuro");
  assert.ok(neuro.includes("TEA"), "neuro debe incluir TEA");
  assert.ok(neuro.includes("Psicosocial"), "neuro debe incluir Psicosocial");

  const motriz = resolveCatalogCategories("motriz");
  assert.ok(motriz.includes("Física"), "motriz debe incluir Física");
});

test("resolveCatalogCategories devuelve [] para valores desconocidos o vacíos", () => {
  assert.deepEqual(resolveCatalogCategories("desconocido"), []);
  assert.deepEqual(resolveCatalogCategories(undefined), []);
  assert.deepEqual(resolveCatalogCategories(null), []);
});

test("EMERGENCY_DISABILITY_TO_CATALOG solo contiene las 4 claves del formulario SOS", () => {
  assert.deepEqual(Object.keys(EMERGENCY_DISABILITY_TO_CATALOG).sort(), [
    "auditiva",
    "motriz",
    "neuro",
    "visual",
  ]);
});

// ---------------------------------------------------------------------------
// Plantillas: asunto, tipo de solicitud, enlace y privacidad
// ---------------------------------------------------------------------------

test("buildMatchedRequestEmail diferencia el asunto urgente del normal", () => {
  const base = {
    nombreDestinatario: "Org Demo",
    rolDestinatario: "organization",
    idSolicitud: "req-1",
    tipoSolicitud: "solicitud de ayuda",
    tipoNecesidad: "transport",
    descripcion: "Se necesita traslado accesible.",
    ubicacionAproximada: "10.481, -66.904 (aprox.)",
    enlaceMapa: "https://sara.example/solicitudes",
  };

  const urgent = buildMatchedRequestEmail({ ...base, urgencia: "critical" });
  const normal = buildMatchedRequestEmail({ ...base, urgencia: "low" });

  assert.notEqual(urgent.subject, normal.subject, "los asuntos deben diferir");
  assert.ok(urgent.subject.includes("[URGENTE]"), "el asunto urgente debe marcarse");
  assert.ok(!normal.subject.includes("[URGENTE]"), "el asunto normal no debe marcarse");
});

test("los asuntos reflejan el tipo de solicitud (emergencia vs solicitud de ayuda)", () => {
  const base = {
    nombreDestinatario: "Org Demo",
    rolDestinatario: "organization",
    idSolicitud: "req-tipo",
    tipoNecesidad: "motor_silla_ruedas",
    urgencia: "high",
    descripcion: "Requiere silla de ruedas.",
    ubicacionAproximada: "10.481, -66.904 (aprox.)",
    enlaceMapa: "https://sara.example/solicitudes",
  };

  const emergency = buildMatchedRequestEmail({ ...base, tipoSolicitud: "emergencia" });
  const helpRequest = buildMatchedRequestEmail({
    ...base,
    tipoSolicitud: "solicitud de ayuda",
  });

  assert.ok(emergency.subject.includes("emergencia"), "emergencia debe aparecer en el asunto");
  assert.ok(
    helpRequest.subject.includes("solicitud de ayuda"),
    "solicitud de ayuda debe aparecer en el asunto",
  );
});

test("NEED_TYPE_LABELS traduce slugs de emergencia en lugar de mostrarlos crudos", () => {
  const labels = require("../src/services/emailTemplates/requestEmails").NEED_TYPE_LABELS;

  for (const slug of [
    "visual_guia_voz",
    "visual_braille",
    "visual_perro_guia",
    "hearing_lengua_senas",
    "hearing_audifono",
    "hearing_implante_coclear",
    "hearing_vibrador_oseo",
    "neuro_ambiente_calmado",
    "neuro_comunicacion_clara",
    "neuro_acompanamiento",
    "motor_silla_ruedas",
    "motor_traslado_asistido",
    "motor_evacuacion_accesible",
  ]) {
    assert.ok(labels[slug], `el slug ${slug} debe tener etiqueta legible`);
  }

  // Las 8 etiquetas previas se conservan.
  assert.equal(labels.transport, "Transporte");
  assert.equal(labels.medication, "Medicamentos");
});

test("buildMatchedRequestEmail incluye el enlace al listado/mapa", () => {
  const enlaceMapa = "https://sara.example/solicitudes";
  const { html } = buildMatchedRequestEmail({
    nombreDestinatario: "Voluntario Demo",
    rolDestinatario: "volunteer",
    idSolicitud: "req-2",
    tipoSolicitud: "solicitud de ayuda",
    tipoNecesidad: "medication",
    urgencia: "medium",
    descripcion: "Requiere medicamentos.",
    ubicacionAproximada: "10.481, -66.904 (aprox.)",
    enlaceMapa,
  });

  assert.ok(html.includes(enlaceMapa), "el HTML debe contener el enlace al listado");
});

test("las plantillas no filtran coordenadas de precisión completa", () => {
  const fullLatitude = "10.4806123456789";
  const fullLongitude = "-66.9036123456789";

  const matched = buildMatchedRequestEmail({
    nombreDestinatario: "Voluntario Demo",
    rolDestinatario: "volunteer",
    idSolicitud: "req-3",
    tipoSolicitud: "emergencia",
    tipoNecesidad: "transport",
    urgencia: "high",
    descripcion: "Traslado.",
    ubicacionAproximada: "10.481, -66.904 (aprox.)",
    enlaceMapa: "https://sara.example/solicitudes",
  });

  const requester = buildRequesterConfirmationEmail({
    nombreSolicitante: "Ana",
    idSolicitud: "req-3",
    tipoSolicitud: "emergencia",
    tipoNecesidad: "transport",
    urgencia: "high",
    descripcion: "Traslado.",
    ubicacionAproximada: "10.481, -66.904 (aprox.)",
    fechaEnvio: "19/09/2026",
    enlaceMapa: "https://sara.example/solicitudes",
  });

  assert.ok(!matched.html.includes(fullLatitude));
  assert.ok(!matched.html.includes(fullLongitude));
  assert.ok(!requester.html.includes(fullLatitude));
  assert.ok(!requester.html.includes(fullLongitude));
});

test("isUrgent reconoce high y critical", () => {
  assert.equal(isUrgent("high"), true);
  assert.equal(isUrgent("critical"), true);
  assert.equal(isUrgent("medium"), false);
  assert.equal(isUrgent("low"), false);
});

// ---------------------------------------------------------------------------
// Servicio: SMTP no configurado (el estado por defecto en desarrollo)
// ---------------------------------------------------------------------------

test("notifyNewHelpRequest no lanza ni consulta la base cuando SMTP no está configurado", async () => {
  const db = require("../src/db");
  const emailService = require("../src/services/email.service");
  const {
    notifyNewHelpRequest,
  } = require("../src/modules/notifications/requestNotifications.service");

  const originalCreateTransport = emailService.createTransport;
  const originalQuery = db.query;
  let dbCalled = false;

  emailService.createTransport = () => null;
  db.query = async () => {
    dbCalled = true;
    throw new Error("db should not be called");
  };

  try {
    await notifyNewHelpRequest({
      id: "req-smtp-off",
      latitude: 10.4806,
      longitude: -66.9036,
      needType: "transport",
      urgency: "high",
      requesterName: "Ana",
      contactMethod: "email",
      contactValue: "ana@example.com",
    });
  } finally {
    emailService.createTransport = originalCreateTransport;
    db.query = originalQuery;
  }

  assert.equal(dbCalled, false, "sin SMTP no debe consultar destinatarios");
});

test("notifyNewEmergency de una emergencia anónima no busca correo de solicitante y nunca lanza", async () => {
  const db = require("../src/db");
  const emailService = require("../src/services/email.service");
  const service = require("../src/modules/notifications/requestNotifications.service");
  const repository = require("../src/modules/notifications/requestNotifications.repository");

  const originalCreateTransport = emailService.createTransport;
  const originalSendEmailWith = emailService.sendEmailWith;
  const originalQuery = db.query;
  const originalFindUserEmailById = repository.findUserEmailById;
  const originalFindMatchingRecipients = repository.findMatchingRecipients;

  // (a) SMTP apagado: no debe lanzar ni tocar la base.
  let dbCalled = false;
  emailService.createTransport = () => null;
  db.query = async () => {
    dbCalled = true;
    throw new Error("db should not be called");
  };

  try {
    await service.notifyNewEmergency({
      id: "emg-anon-off",
      latitude: 10.4806,
      longitude: -66.9036,
      needType: "motor_silla_ruedas",
      urgency: "critical",
      requesterName: "Anónimo",
      // sin userId: emergencia anónima
    });
  } finally {
    emailService.createTransport = originalCreateTransport;
    db.query = originalQuery;
  }

  assert.equal(dbCalled, false, "sin SMTP no debe consultar la base");

  // (b) SMTP encendido pero anónima: no debe resolver correo de solicitante.
  let requesterLookupCalled = false;
  emailService.createTransport = () => ({ sendMail: async () => ({}) });
  emailService.sendEmailWith = async () => ({ skipped: true });
  repository.findMatchingRecipients = async () => [];
  repository.findUserEmailById = async () => {
    requesterLookupCalled = true;
    return "nadie@example.com";
  };

  try {
    await service.notifyNewEmergency({
      id: "emg-anon-on",
      latitude: 10.4806,
      longitude: -66.9036,
      needType: "motor_silla_ruedas",
      urgency: "critical",
      requesterName: "Anónimo",
    });
  } finally {
    emailService.createTransport = originalCreateTransport;
    emailService.sendEmailWith = originalSendEmailWith;
    repository.findMatchingRecipients = originalFindMatchingRecipients;
    repository.findUserEmailById = originalFindUserEmailById;
  }

  assert.equal(
    requesterLookupCalled,
    false,
    "una emergencia anónima no debe buscar correo de solicitante",
  );
});

// ---------------------------------------------------------------------------
// Enlace del correo: cada tipo de solicitud apunta a su pantalla
// ---------------------------------------------------------------------------

test("buildMapLink apunta a /mapa para emergencias y a /solicitudes para apoyo", () => {
  const emergencia = buildMapLink("emergencia");
  const apoyo = buildMapLink("solicitud de ayuda");

  assert.ok(
    emergencia.endsWith("/mapa"),
    `las emergencias deben enlazar al mapa, no a una pantalla sin emergencias (recibido: ${emergencia})`,
  );
  assert.ok(
    apoyo.endsWith("/solicitudes"),
    `las solicitudes de apoyo deben enlazar a /solicitudes (recibido: ${apoyo})`,
  );
  assert.notEqual(
    emergencia,
    apoyo,
    "emergencias y solicitudes de apoyo se listan en pantallas distintas",
  );
});
