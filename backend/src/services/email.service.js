const nodemailer = require("nodemailer");
const { smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom } = require("../config");

function createTransporter() {
  if (!smtpHost || !smtpUser || !smtpPass) {
    return null;
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: Number(smtpPort || 587),
    secure: Number(smtpPort || 587) === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
}

async function sendEmail(to, subject, html) {
  const transporter = createTransporter();
  if (!transporter) {
    throw new Error("SMTP no configurado. Revisa SMTP_HOST, SMTP_USER y SMTP_PASS");
  }

  return transporter.sendMail({
    from: smtpFrom || smtpUser,
    to,
    subject,
    html,
  });
}

module.exports = {
  createTransporter,
  sendEmail,
};
