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

async function sendEmail(to, subject, html) {
  const transporter = createTransport();
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

module.exports = {
  sendEmail,
  createTransport,
};
