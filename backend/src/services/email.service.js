const nodemailer = require("nodemailer");
const { smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom } = require("../config");

function createTransport() {
  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
    return null;
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: Number(smtpPort),
    secure: Number(smtpPort) === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

/**
 * Envía un correo reutilizando un transporte ya creado. Pensado para envíos
 * masivos: el llamador crea UN transporte y lo comparte, en lugar de abrir
 * una conexión SMTP nueva por destinatario.
 * @param {Object|null} transporter — salida de createTransport()
 * @param {string} to
 * @param {string} subject
 * @param {string} html
 * @returns {Promise<Object>}
 */
async function sendEmailWith(transporter, to, subject, html) {
  if (!transporter) {
    console.warn("SMTP no configurado: omitiendo envío de correo.");
    return { skipped: true };
  }

  const mailOptions = {
    from: smtpFrom || smtpUser,
    to,
    subject,
    html,
  };

  return transporter.sendMail(mailOptions);
}

async function sendEmail(to, subject, html) {
  const transporter = createTransport();
  return sendEmailWith(transporter, to, subject, html);
}

module.exports = {
  sendEmail,
  sendEmailWith,
  createTransport,
};
