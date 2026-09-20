/**
 * Servicio — notificaciones por correo al crear una nueva solicitud.
 *
 * Generalizado para cubrir solicitudes de ayuda y emergencias con un único
 * despachador interno. Este flujo es "best-effort": NUNCA lanza. Un fallo de
 * correo (SMTP no configurado, destinatario inválido, etc.) no debe impedir
 * que la solicitud quede registrada. Los errores se registran con
 * console.warn/console.error; el resumen normal usa console.log.
 */
const config = require("../../config");
const emailService = require("../../services/email.service");
const repository = require("./requestNotifications.repository");
const { resolveCatalogCategories } = require("./emergencyCategories");
const {
  buildRequesterConfirmationEmail,
  buildMatchedRequestEmail,
} = require("../../services/emailTemplates/requestEmails");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Lee el primer campo presente entre varios nombres posibles (camelCase o
 * snake_case). Necesario porque las dos rutas de creación de emergencias
 * devuelven la fila con distinto alias.
 * @param {Object} row
 * @param {...string} keys
 * @returns {*}
 */
function pick(row, ...keys) {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null) {
      return value;
    }
  }
  return undefined;
}

/**
 * Convierte un valor a número finito, o null si no es válido/vacío.
 * @param {*} value
 * @returns {number|null}
 */
function toFiniteNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

/**
 * @param {Object} row
 * @returns {boolean}
 */
function hasCoordinates(row) {
  return (
    toFiniteNumber(row?.latitude) !== null && toFiniteNumber(row?.longitude) !== null
  );
}

/**
 * Construye la URL del listado en el frontend.
 *
 * Las emergencias y las solicitudes de apoyo se listan en pantallas distintas:
 * `/mapa` muestra emergencias (+ solicitudes) y `/solicitudes` solo solicitudes
 * de apoyo. Enlazar una emergencia a `/solicitudes` dejaría al respondedor en
 * una pantalla sin la emergencia que acaba de recibir por correo.
 *
 * @param {string} tipoSolicitud
 * @returns {string}
 */
function buildMapLink(tipoSolicitud) {
  const baseUrl = String(config.appBaseUrl || "").replace(/\/$/, "");
  const path =
    tipoSolicitud === "emergencia"
      ? config.notifyEmergencyMapPath
      : config.notifyMapPath;
  return `${baseUrl}${path}`;
}

/**
 * Ubicación aproximada para mostrar en el correo. Nunca usa precisión
 * completa: o se usa la dirección provista, o las coordenadas redondeadas
 * a 3 decimales (≈100 m).
 * @param {Object} row
 * @returns {string}
 */
function buildApproximateLocation(row) {
  const address = String(pick(row, "address") || "").trim();
  if (address) {
    return address;
  }

  const latitude = toFiniteNumber(row?.latitude);
  const longitude = toFiniteNumber(row?.longitude);
  if (latitude === null || longitude === null) {
    return "Ubicación no especificada";
  }

  return `${latitude.toFixed(3)}, ${longitude.toFixed(3)} (aprox.)`;
}

/**
 * Fecha legible para el correo.
 * @param {Object} row
 * @returns {string}
 */
function buildSentDate(row) {
  const createdAt = pick(row, "createdAt", "created_at");
  const value = createdAt ? new Date(createdAt) : new Date();
  if (Number.isNaN(value.getTime())) {
    return new Date().toLocaleString("es-VE");
  }
  return value.toLocaleString("es-VE");
}

/**
 * Deduplica destinatarios por correo (sin distinguir mayúsculas).
 * @param {Array} recipients
 * @returns {Array}
 */
function dedupeByEmail(recipients) {
  const seen = new Set();
  const unique = [];

  for (const recipient of recipients || []) {
    const email = String(recipient?.email || "").trim();
    if (!email) {
      continue;
    }

    const key = email.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push({ ...recipient, email });
  }

  return unique;
}

// ---------------------------------------------------------------------------
// Resolución del correo del solicitante
// ---------------------------------------------------------------------------

/**
 * Solicitud de ayuda: primero el contacto si es email, luego la cuenta asociada.
 * @param {Object} row
 * @returns {Promise<string|null>}
 */
async function resolveHelpRequestRequesterEmail(row) {
  if (pick(row, "contactMethod", "contact_method") === "email") {
    const contactValue = String(pick(row, "contactValue", "contact_value") || "").trim();
    if (contactValue) {
      return contactValue;
    }
  }

  const userId = pick(row, "userId", "user_id");
  if (userId) {
    return repository.findUserEmailById(userId);
  }

  return null;
}

/**
 * Emergencia: SOLO la cuenta asociada. No existe columna de correo en
 * `emergencies`, así que una emergencia anónima (sin user_id) nunca recibe
 * acuse de recibo. Nunca se inventa una dirección.
 * @param {Object} row
 * @returns {Promise<string|null>}
 */
async function resolveEmergencyRequesterEmail(row) {
  const userId = pick(row, "userId", "user_id");
  if (!userId) {
    return null;
  }
  return repository.findUserEmailById(userId);
}

// ---------------------------------------------------------------------------
// Envíos
// ---------------------------------------------------------------------------

/**
 * Intenta enviar el acuse de recibo al solicitante.
 * @param {Object} row
 * @param {Object} transporter
 * @param {string} tipoSolicitud
 * @param {Function} requesterEmailResolver
 * @returns {Promise<void>}
 */
async function sendRequesterConfirmation(
  row,
  transporter,
  tipoSolicitud,
  requesterEmailResolver,
) {
  let email = null;
  try {
    email = await requesterEmailResolver(row);
  } catch (error) {
    console.warn(
      `[notifications] Solicitud ${row.id}: no se pudo resolver el correo del solicitante:`,
      error?.message || error,
    );
    return;
  }

  if (!email) {
    console.warn(
      `[notifications] Solicitud ${row.id}: sin correo del solicitante; se omite la confirmación.`,
    );
    return;
  }

  const { subject, html } = buildRequesterConfirmationEmail({
    nombreSolicitante: pick(row, "requesterName", "requester_name"),
    idSolicitud: row.id,
    tipoSolicitud,
    tipoNecesidad: pick(row, "needType", "need_type"),
    urgencia: row.urgency,
    descripcion: row.description,
    ubicacionAproximada: buildApproximateLocation(row),
    fechaEnvio: buildSentDate(row),
    enlaceMapa: buildMapLink(tipoSolicitud),
  });

  try {
    await emailService.sendEmailWith(transporter, email, subject, html);
  } catch (error) {
    console.warn(
      `[notifications] No se pudo enviar la confirmación a ${email}:`,
      error?.message || error,
    );
  }
}

/**
 * Busca destinatarios y les envía el aviso, reutilizando un solo transporte.
 * @param {Object} row
 * @param {Object} transporter
 * @param {Object} options
 * @param {string} options.tipoSolicitud
 * @param {string[]} options.categoryNames
 * @returns {Promise<void>}
 */
async function sendMatchedNotifications(row, transporter, { tipoSolicitud, categoryNames }) {
  const recipients = await repository.findMatchingRecipients({
    latitude: toFiniteNumber(row.latitude),
    longitude: toFiniteNumber(row.longitude),
    radiusKm: config.notifyRadiusKm,
    categoryNames,
    excludeUserId: pick(row, "userId", "user_id") || null,
    limit: config.notifyMaxRecipients,
  });

  const uniqueRecipients = dedupeByEmail(recipients);
  if (uniqueRecipients.length === 0) {
    console.warn(
      `[notifications] Solicitud ${row.id}: 0 coincidencias en ${config.notifyRadiusKm} km.`,
    );
    return;
  }

  const enlaceMapa = buildMapLink(tipoSolicitud);
  const ubicacionAproximada = buildApproximateLocation(row);

  let sent = 0;
  let failed = 0;

  for (const recipient of uniqueRecipients) {
    try {
      const { subject, html } = buildMatchedRequestEmail({
        nombreDestinatario: recipient.fullName,
        rolDestinatario: recipient.role,
        idSolicitud: row.id,
        tipoSolicitud,
        tipoNecesidad: pick(row, "needType", "need_type"),
        urgencia: row.urgency,
        descripcion: row.description,
        ubicacionAproximada,
        enlaceMapa,
      });

      await emailService.sendEmailWith(transporter, recipient.email, subject, html);
      sent += 1;
    } catch (error) {
      failed += 1;
      console.warn(
        `[notifications] No se pudo enviar a ${recipient.email}:`,
        error?.message || error,
      );
    }
  }

  // Resumen informativo del resultado normal (no es una advertencia: un warn
  // en cada solicitud exitosa volvería ruidoso el nivel de warning).
  console.log(
    `[notifications] Solicitud ${row.id}: ${uniqueRecipients.length} coincidencias, ${sent} enviados, ${failed} fallidos.`,
  );
}

// ---------------------------------------------------------------------------
// Despachador común
// ---------------------------------------------------------------------------

/**
 * Despachador compartido. Nunca lanza.
 * @param {Object} row
 * @param {Object} options
 * @param {string} options.tipoSolicitud
 * @param {string[]} options.categoryNames
 * @param {Function} options.requesterEmailResolver
 * @returns {Promise<void>}
 */
async function dispatch(row, { tipoSolicitud, categoryNames, requesterEmailResolver }) {
  try {
    if (!row || !row.id) {
      console.warn("[notifications] Se recibió una solicitud sin id; se omite la notificación.");
      return;
    }

    // Un solo transporte para todos los envíos, para no abrir una conexión
    // SMTP nueva por destinatario.
    const transporter = emailService.createTransport();

    // Sin SMTP configurado no hay nada que enviar. Se corta aquí para no
    // reportar envíos falsos ni recorrer destinatarios inútilmente.
    if (!transporter) {
      console.warn(
        `[notifications] Solicitud ${row.id}: SMTP no configurado; se omiten las notificaciones.`,
      );
      return;
    }

    await sendRequesterConfirmation(row, transporter, tipoSolicitud, requesterEmailResolver);

    if (!hasCoordinates(row)) {
      console.warn(
        `[notifications] Solicitud ${row.id}: sin coordenadas; no se pueden buscar destinatarios por radio.`,
      );
      return;
    }

    await sendMatchedNotifications(row, transporter, { tipoSolicitud, categoryNames });
  } catch (error) {
    console.error(
      "[notifications] Error inesperado al notificar la nueva solicitud:",
      error?.message || error,
    );
  }
}

// ---------------------------------------------------------------------------
// Puntos de entrada
// ---------------------------------------------------------------------------

/**
 * Notifica por correo una nueva solicitud de ayuda. Nunca lanza.
 * @param {Object} row — fila devuelta por insertHelpRequest
 * @returns {Promise<void>}
 */
async function notifyNewHelpRequest(row) {
  const disabilityType = pick(row, "disabilityType", "disability_type");
  return dispatch(row, {
    tipoSolicitud: "solicitud de ayuda",
    categoryNames: disabilityType ? [disabilityType] : [],
    requesterEmailResolver: resolveHelpRequestRequesterEmail,
  });
}

/**
 * Notifica por correo una nueva emergencia. Nunca lanza.
 * @param {Object} row — fila de emergencies (camelCase o snake_case)
 * @returns {Promise<void>}
 */
async function notifyNewEmergency(row) {
  const disabilityType = pick(row, "disabilityType", "disability_type");
  return dispatch(row, {
    tipoSolicitud: "emergencia",
    categoryNames: resolveCatalogCategories(disabilityType),
    requesterEmailResolver: resolveEmergencyRequesterEmail,
  });
}

module.exports = {
  notifyNewHelpRequest,
  notifyNewEmergency,
  // Exportado para pruebas de regresión del destino del enlace.
  buildMapLink,
};
