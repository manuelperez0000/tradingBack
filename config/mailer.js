import "dotenv/config";
import nodemailer from "nodemailer";

export async function sendPasswordResetEmail(email, resetUrl) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM } =
    process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASSWORD || !SMTP_FROM) {
    throw new Error("SMTP configuration is incomplete");
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number.parseInt(SMTP_PORT, 10),
    secure: Number.parseInt(SMTP_PORT, 10) === 465,
    requireTLS: Number.parseInt(SMTP_PORT, 10) !== 465,
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
  });

  await transporter.sendMail({
    from: SMTP_FROM,
    to: email,
    subject: "Recuperación de contraseña",
    text: `Usa este enlace para cambiar tu contraseña (válido durante 1 hora): ${resetUrl}`,
    html: `<p>Usa este enlace para cambiar tu contraseña (válido durante 1 hora):</p><p><a href="${resetUrl}">Cambiar contraseña</a></p>`,
  });
}
