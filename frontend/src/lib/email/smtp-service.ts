import nodemailer, { Transporter } from "nodemailer";

let transporter: Transporter | null = null;

/**
 * Initialize SMTP transporter
 * Supports Gmail, Outlook, or any SMTP provider
 */
function getTransporter(): Transporter {
  if (transporter) {
    return transporter;
  }

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || "587", 10);
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;

  if (!smtpHost || !smtpUser || !smtpPassword) {
    throw new Error(
      "SMTP configuration missing. Please set SMTP_HOST, SMTP_USER, and SMTP_PASSWORD"
    );
  }

  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465, // Use TLS for port 587, SSL for port 465
    auth: {
      user: smtpUser,
      pass: smtpPassword,
    },
  });

  return transporter;
}

/**
 * Send email using SMTP
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<void> {
  try {
    const transport = getTransporter();
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;

    const result = await transport.sendMail({
      from,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ""), // Strip HTML if no text version
    });

    console.log(`[Email] Sent to ${to} - ${subject} (${result.messageId})`);
  } catch (error) {
    console.error(`[Email Error] Failed to send email to ${to}:`, error);
    throw error;
  }
}

/**
 * Test SMTP connection
 */
export async function testSMTPConnection(): Promise<boolean> {
  try {
    const transport = getTransporter();
    await transport.verify();
    console.log("[Email] SMTP connection verified ✓");
    return true;
  } catch (error) {
    console.error("[Email] SMTP connection failed:", error);
    return false;
  }
}
