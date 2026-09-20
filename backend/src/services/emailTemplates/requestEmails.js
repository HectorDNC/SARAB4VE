/**
 * Plantillas de correo para notificaciones de nuevas solicitudes.
 *
 * Generalizadas para cubrir tanto solicitudes de ayuda como emergencias:
 * `tipoSolicitud` es "solicitud de ayuda" o "emergencia".
 *
 * Expone dos constructores:
 *   - buildRequesterConfirmationEmail: acuse de recibo para quien solicita.
 *   - buildMatchedRequestEmail: aviso para organizaciones/voluntarios cercanos.
 *
 * PRIVACIDAD: estas plantillas NUNCA reciben coordenadas de precisión completa.
 * El llamador debe pasar `ubicacionAproximada` ya redondeada (o una dirección)
 * y aquí solo se renderiza tal cual.
 */

const NEED_TYPE_LABELS = {
  // Solicitudes de ayuda
  equipment: "Equipos y ayudas técnicas",
  medication: "Medicamentos",
  transport: "Transporte",
  companionship: "Acompañamiento",
  interpreter: "Intérprete",
  accessible_information: "Información accesible",
  neurodivergent_support: "Apoyo neurodivergente",
  psychosocial_support: "Apoyo psicosocial",
  // Emergencias (slugs del formulario SOS)
  visual_guia_voz: "Guía por voz",
  visual_braille: "Material en braille",
  visual_perro_guia: "Perro guía",
  hearing_lengua_senas: "Lengua de señas",
  hearing_audifono: "Usa audífonos",
  hearing_implante_coclear: "Implante coclear",
  hearing_vibrador_oseo: "Vibrador óseo",
  neuro_ambiente_calmado: "Ambiente calmado",
  neuro_comunicacion_clara: "Comunicación clara",
  neuro_acompanamiento: "Acompañamiento",
  motor_silla_ruedas: "Silla de ruedas",
  motor_traslado_asistido: "Traslado asistido",
  motor_evacuacion_accesible: "Evacuación accesible",
};

const URGENCY_LABELS = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  critical: "Crítica",
};

const ROLE_LABELS = {
  organization: "organización",
  volunteer: "voluntario",
};

const DEFAULT_REQUEST_TYPE = "solicitud de ayuda";

/**
 * Una solicitud es urgente cuando su urgencia es alta o crítica.
 * @param {string} urgency
 * @returns {boolean}
 */
function isUrgent(urgency) {
  return urgency === "high" || urgency === "critical";
}

/**
 * Escapa texto proveniente del usuario antes de insertarlo en HTML.
 * @param {string} value
 * @returns {string}
 */
function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * @param {string} tipoSolicitud
 * @returns {string}
 */
function requestTypeLabel(tipoSolicitud) {
  return tipoSolicitud || DEFAULT_REQUEST_TYPE;
}

/**
 * Capitaliza la primera letra para encabezados.
 * @param {string} value
 * @returns {string}
 */
function capitalize(value) {
  const text = String(value || "");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * @param {string} needType
 * @returns {string}
 */
function needTypeLabel(needType) {
  return NEED_TYPE_LABELS[needType] || needType || "Apoyo";
}

/**
 * @param {string} urgency
 * @returns {string}
 */
function urgencyLabel(urgency) {
  return URGENCY_LABELS[urgency] || urgency || "No especificada";
}

/**
 * @param {string} role
 * @returns {string}
 */
function roleLabel(role) {
  return ROLE_LABELS[role] || "colaborador";
}

/**
 * Franja superior del correo; en rojo cuando la solicitud es urgente.
 * @param {boolean} urgent
 * @param {string} titulo
 * @returns {string}
 */
function buildHeaderBand(urgent, titulo) {
  const background = urgent ? "#b91c1c" : "#2563eb";
  return `<div style="background:${background}; padding:14px 20px; border-radius:8px 8px 0 0;">
      <p style="margin:0; color:#ffffff; font-size:16px; font-weight:bold;">${titulo}</p>
    </div>`;
}

/**
 * Botón/enlace destacado hacia el listado en el frontend.
 * @param {string} enlaceMapa
 * @param {boolean} urgent
 * @param {string} tipoSolicitud
 * @returns {string}
 */
function buildMapLinkBlock(enlaceMapa, urgent, tipoSolicitud) {
  const background = urgent ? "#b91c1c" : "#2563eb";
  const etiqueta =
    requestTypeLabel(tipoSolicitud) === "emergencia" ? "emergencias" : "solicitudes";
  return `
      <p>
        <a href="${enlaceMapa}" style="display:inline-block; background:${background}; color:#ffffff; text-decoration:none; padding:12px 20px; border-radius:8px;">
          Ver ${etiqueta} en el mapa
        </a>
      </p>
      <p>Enlace directo: <a href="${enlaceMapa}">${enlaceMapa}</a></p>
  `;
}

/**
 * Correo de confirmación para quien creó la solicitud.
 * @param {Object} params
 * @returns {{ subject: string, html: string }}
 */
function buildRequesterConfirmationEmail({
  nombreSolicitante,
  idSolicitud,
  tipoSolicitud,
  tipoNecesidad,
  urgencia,
  descripcion,
  ubicacionAproximada,
  fechaEnvio,
  enlaceMapa,
}) {
  const urgent = isUrgent(urgencia);
  const tipo = needTypeLabel(tipoNecesidad);
  const solicitud = requestTypeLabel(tipoSolicitud);
  const subject = `${urgent ? "[URGENTE] " : ""}Recibimos tu ${solicitud} de ${tipo}`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 560px;">
      ${buildHeaderBand(
        urgent,
        urgent
          ? `${capitalize(solicitud)} urgente registrada`
          : `${capitalize(solicitud)} registrada`,
      )}
      <div style="border:1px solid #e5e7eb; border-top:none; border-radius:0 0 8px 8px; padding:20px;">
        <p>Hola ${escapeHtml(nombreSolicitante)},</p>
        <p>Recibimos tu ${escapeHtml(solicitud)} y ya está visible para organizaciones y voluntarios de tu zona.</p>
        <p><strong>ID:</strong> ${escapeHtml(idSolicitud)}</p>
        <p><strong>Tipo de necesidad:</strong> ${escapeHtml(tipo)}</p>
        <p><strong>Urgencia:</strong> ${escapeHtml(urgencyLabel(urgencia))}</p>
        <p><strong>Ubicación aproximada:</strong> ${escapeHtml(ubicacionAproximada)}</p>
        <p><strong>Descripción:</strong> ${escapeHtml(descripcion)}</p>
        <p><strong>Fecha de envío:</strong> ${escapeHtml(fechaEnvio)}</p>
        ${buildMapLinkBlock(enlaceMapa, urgent, solicitud)}
        <p>Te escribiremos de nuevo cuando alguien atienda tu ${escapeHtml(solicitud)}.</p>
        <p>Atentamente,<br />Equipo SARA</p>
      </div>
    </div>
  `;

  return { subject, html };
}

/**
 * Correo para una organización o voluntario que coincide por categoría/zona.
 * @param {Object} params
 * @returns {{ subject: string, html: string }}
 */
function buildMatchedRequestEmail({
  nombreDestinatario,
  rolDestinatario,
  idSolicitud,
  tipoSolicitud,
  tipoNecesidad,
  urgencia,
  descripcion,
  ubicacionAproximada,
  enlaceMapa,
}) {
  const urgent = isUrgent(urgencia);
  const tipo = needTypeLabel(tipoNecesidad);
  const solicitud = requestTypeLabel(tipoSolicitud);
  const subject = `${urgent ? "[URGENTE] " : ""}Nueva ${solicitud} de ${tipo} en tu zona`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 560px;">
      ${buildHeaderBand(
        urgent,
        urgent
          ? `Nueva ${escapeHtml(solicitud)} URGENTE en tu zona`
          : `Nueva ${escapeHtml(solicitud)} en tu zona`,
      )}
      <div style="border:1px solid #e5e7eb; border-top:none; border-radius:0 0 8px 8px; padding:20px;">
        <p>Hola ${escapeHtml(nombreDestinatario)},</p>
        <p>Como ${escapeHtml(roleLabel(rolDestinatario))} registrado en SARA, te avisamos de una nueva ${escapeHtml(solicitud)} que coincide con tu zona.</p>
        <p><strong>ID:</strong> ${escapeHtml(idSolicitud)}</p>
        <p><strong>Tipo de necesidad:</strong> ${escapeHtml(tipo)}</p>
        <p><strong>Urgencia:</strong> ${escapeHtml(urgencyLabel(urgencia))}</p>
        <p><strong>Ubicación aproximada:</strong> ${escapeHtml(ubicacionAproximada)}</p>
        <p><strong>Descripción:</strong> ${escapeHtml(descripcion)}</p>
        ${buildMapLinkBlock(enlaceMapa, urgent, solicitud)}
        <p>Ingresa para ver el detalle y ofrecer tu ayuda.</p>
        <p>Atentamente,<br />Equipo SARA</p>
      </div>
    </div>
  `;

  return { subject, html };
}

module.exports = {
  NEED_TYPE_LABELS,
  URGENCY_LABELS,
  isUrgent,
  buildRequesterConfirmationEmail,
  buildMatchedRequestEmail,
};
