function buildConfirmationEmail({ nombreSolicitante, tipoSolicitud, idSolicitud, fechaEnvio }) {
  const subject = "Hemos recibido tu solicitud de registro";
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
      <h2>¡Gracias por registrarte en SARA!</h2>
      <p>Hola ${nombreSolicitante},</p>
      <p>Hemos recibido tu solicitud de ${tipoSolicitud} y la estamos revisando.</p>
      <p><strong>ID de solicitud:</strong> ${idSolicitud}</p>
      <p><strong>Fecha de envío:</strong> ${fechaEnvio}</p>
      <p>Te avisaremos por correo cuando se revise tu solicitud.</p>
      <p>Mientras tanto, puedes seguir usando la plataforma normalmente.</p>
      <p>Atentamente,<br />Equipo SARA</p>
    </div>
  `;

  return { subject, html };
}

function buildValidatorEmail({ nombreSolicitante, tipoSolicitud, idSolicitud, fechaEnvio, resumenDatos, listaDocumentos, linkIniciarRevision }) {
  const subject = "Nueva solicitud para revisar";
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
      <h2>Nueva solicitud pendiente de revisión</h2>
      <p>Se ha recibido una nueva solicitud de ${tipoSolicitud}.</p>
      <p><strong>Solicitante:</strong> ${nombreSolicitante}</p>
      <p><strong>ID de solicitud:</strong> ${idSolicitud}</p>
      <p><strong>Fecha:</strong> ${fechaEnvio}</p>
      <p><strong>Resumen:</strong> ${resumenDatos}</p>
      <p><strong>Documentos:</strong> ${listaDocumentos}</p>
      <p>
        <a href="${linkIniciarRevision}" style="display:inline-block; background:#2563eb; color:#fff; text-decoration:none; padding:12px 20px; border-radius:8px;">
          Iniciar revisión
        </a>
      </p>
      <p>Link de revisión: <a href="${linkIniciarRevision}">${linkIniciarRevision}</a></p>
      <p>Atentamente,<br />Sistema SARA</p>
    </div>
  `;

  return { subject, html };
}

function buildInStudyEmail({ nombreSolicitante, idSolicitud }) {
  const subject = `Tu solicitud está en revisión — ${idSolicitud}`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
      <h2>Tu solicitud está en revisión</h2>
      <p>Hola ${nombreSolicitante},</p>
      <p>Tu solicitud ${idSolicitud} ya está siendo revisada por nuestro equipo de validación.</p>
      <p><strong>Estado actual:</strong> Pendiente – EN ESTUDIO</p>
      <p>Te escribiremos de nuevo en cuanto tengamos un resultado. No es necesario que hagas nada mientras tanto.</p>
      <p>Equipo SARA</p>
    </div>
  `;

  return { subject, html };
}

function buildAcceptedEmail({ nombreSolicitante, idSolicitud, linkCompletarRegistro }) {
  const subject = `¡Tu solicitud fue aceptada! — ${idSolicitud}`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
      <h2>¡Tenemos buenas noticias!</h2>
      <p>Hola ${nombreSolicitante},</p>
      <p>Tu solicitud ${idSolicitud} fue aceptada.</p>
      <p><strong>Estado final:</strong> ACEPTADA</p>
      <p>Solo falta un paso para activar tu cuenta: define tu contraseña en el siguiente enlace.</p>
      <p>
        <a href="${linkCompletarRegistro}" style="display:inline-block; background:#2563eb; color:#fff; text-decoration:none; padding:12px 20px; border-radius:8px;">
          Completar registro
        </a>
      </p>
      <p>Link: <a href="${linkCompletarRegistro}">${linkCompletarRegistro}</a></p>
      <p>Este enlace es personal, de un solo uso, y te llevará directamente a la pantalla para crear tu contraseña.</p>
      <p>¡Bienvenido/a a SARA!</p>
    </div>
  `;

  return { subject, html };
}

function buildRejectedEmail({ nombreSolicitante, idSolicitud, motivoRechazo }) {
  const subject = `Resultado de tu solicitud — ${idSolicitud}`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
      <h2>Resultado de tu solicitud</h2>
      <p>Hola ${nombreSolicitante},</p>
      <p>Después de revisar tu solicitud ${idSolicitud}, no fue posible aprobarla en esta ocasión.</p>
      <p><strong>Estado final:</strong> RECHAZADA</p>
      <p><strong>Motivo:</strong> ${motivoRechazo}</p>
      <p>Si consideras que esto fue un error o quieres corregir la información indicada, puedes volver a enviar una nueva solicitud desde el formulario de SARA.</p>
      <p>Equipo SARA</p>
    </div>
  `;

  return { subject, html };
}

module.exports = {
  buildConfirmationEmail,
  buildValidatorEmail,
  buildInStudyEmail,
  buildAcceptedEmail,
  buildRejectedEmail,
};
