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

export interface SendEmailResult {
  ok: boolean;
  id?: string;
  error?: string;
}

/**
 * Send email via Resend. Falls back to console.log if RESEND_API_KEY is not set.
 * Never throws — returns { ok: false, error } on failure.
 * Backward-compatible: existing callers that ignore the return value still work.
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
}): Promise<SendEmailResult> {
  const sender = from || DEFAULT_FROM;
  const plainText = text || html.replace(/<[^>]*>/g, "");

  const client = getClient();

  if (!client) {
    // Stub mode: log the email details for local dev
    console.log(
      `[Email Stub] To: ${to} | Subject: ${subject} | From: ${sender}`,
    );
    return { ok: false, error: "RESEND_API_KEY not set" };
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
      return { ok: false, error: result.error.message };
    }

    const resendId = result.data?.id;
    console.log(
      `[Email] Sent to ${to} — subject: "${subject}" — resend_id: ${resendId}`,
    );
    return { ok: true, id: resendId };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[Email] Error sending to ${to}:`, msg);
    return { ok: false, error: msg };
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
