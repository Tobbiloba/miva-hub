import { Resend } from "resend";

const DEFAULT_FROM = "Askly <noreply@ilehq.com>";

let resendClient: Resend | null = null;
let missingKeyWarned = false;

function getClient(): Resend | null {
  if (resendClient) return resendClient;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    if (!missingKeyWarned) {
      console.warn(
        "[Email] RESEND_API_KEY not set — emails are being logged, not sent.",
      );
      missingKeyWarned = true;
    }
    return null;
  }

  resendClient = new Resend(apiKey);
  return resendClient;
}

/**
 * Send email via Resend. Falls back to console.log if RESEND_API_KEY is not set.
 * Never throws — callers should not break on email failure.
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  from,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}): Promise<void> {
  const sender = from || DEFAULT_FROM;
  const plainText = text || html.replace(/<[^>]*>/g, "");

  const client = getClient();

  if (!client) {
    // Stub mode: log the email details for local dev
    console.log(`[Email Stub] To: ${to} | Subject: ${subject} | From: ${sender}`);
    return;
  }

  try {
    const result = await client.emails.send({
      from: sender,
      to,
      subject,
      html,
      text: plainText,
    });

    if (result.error) {
      console.error(`[Email] Failed to send to ${to}:`, result.error.message);
      return;
    }

    console.log(
      `[Email] Sent to ${to} — subject: "${subject}" — resend_id: ${result.data?.id}`,
    );
  } catch (error) {
    console.error(
      `[Email] Error sending to ${to}:`,
      error instanceof Error ? error.message : error,
    );
  }
}

/**
 * Test email connection (checks if API key is set and valid).
 */
export async function testSMTPConnection(): Promise<boolean> {
  const client = getClient();
  if (!client) {
    console.warn("[Email] Cannot test — RESEND_API_KEY not set");
    return false;
  }
  console.log("[Email] Resend client initialized ✓");
  return true;
}
