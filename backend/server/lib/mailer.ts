import nodemailer from 'nodemailer';

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;
let warned = false;

function getTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    return null;
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: Number(SMTP_PORT) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return transporter;
}

export async function sendEmail(to: string, subject: string, text: string): Promise<void> {
  const t = getTransporter();
  if (!t) {
    if (!warned) {
      console.warn('[mailer] SMTP env vars not set — email sending is disabled, notifications will be in-app only.');
      warned = true;
    }
    return;
  }
  try {
    await t.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
    });
  } catch (err) {
    console.error('[mailer] Failed to send email:', err instanceof Error ? err.message : err);
  }
}
