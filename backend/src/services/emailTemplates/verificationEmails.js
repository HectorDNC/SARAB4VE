function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(date = new Date()) {
  const d = new Date(date);
  return d.toISOString().replace("T", " ").replace(".000Z", " UTC");
}

function buildConfirmationEmail({ nombreSolicitante, tipoSolicitud, idSolicitud, fechaEnvio }) {
  const safeName = escapeHtml(nombreSolicitante || "");
  const safeType = escapeHtml(tipoSolicitud || "");
  const safeId = escapeHtml(idSolicitud || "");
  const safeDate = escapeHtml(fechaEnvio || formatDate());

  return {
    subject: `Hemos recibido tu solicitud — ${safeId}`,
    html: `
      <p>Hola ${safeName},</p>
      <p>Confirmamos que recibimos tu solicitud de registro en SARA correctamente.</p>
      <p>Estos son los datos:<br>
      Tipo de solicitud: ${safeType}<br>
      ID de solicitud: ${safeId}<br>
      Fecha de envío: ${safeDate}<br>
      Estado actual: ENTREGADA</p>
      <p>En los próximos días nuestro equipo de validación revisará tu información y documentación. Te avisaremos por este mismo correo en cada cambio de estado, hasta llegar a un resultado final.</p>
      <p>No necesitas responder este correo ni realizar ninguna acción adicional por ahora.</p>
      <p>Equipo SARA</p>
    `,
  };
}

function buildValidatorEmail({ nombreSolicitante, tipoSolicitud, idSolicitud, fechaEnvio, resumenDatos, listaDocumentos, linkIniciarRevision }) {
  const safeName = escapeHtml(nombreSolicitante || "");
  const safeType = escapeHtml(tipoSolicitud || "");
  const safeId = escapeHtml(idSolicitud || "");
  const safeDate = escapeHtml(fechaEnvio || formatDate());
  const safeSummary = escapeHtml(resumenDatos || "");
  const safeDocs = escapeHtml(listaDocumentos || "");
  const safeLink = escapeHtml(linkIniciarRevision || "");

  return {
    subject: `Nueva solicitud para revisar — ${safeId}`,
    html: `
      <p>Hola,</p>
      <p>Llegó una nueva solicitud de ${safeType} que requiere validación:</p>
      <p>Solicitante: ${safeName}<br>
      ID de solicitud: ${safeId}<br>
      Fecha de envío: ${safeDate}</p>
      <p>${safeSummary}</p>
      <p>Documentos adjuntos: ${safeDocs}</p>
      <p>Cuando comiences a revisar el caso, haz clic en el siguiente botón para marcarlo como en estudio y avisar automáticamente al solicitante:</p>
      <p><a href="${safeLink}" data-action="iniciar_revision">[ Iniciar revisión ]</a> → ${safeLink}</p>
      <p>Este enlace es de un solo uso y solo funciona mientras la solicitud esté en estado ENTREGADA.</p>
      <p>Equipo SARA</p>
    `,
  };
}

module.exports = {
  buildConfirmationEmail,
  buildValidatorEmail,
};
