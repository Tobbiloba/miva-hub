/**
 * One-off test: send a single real email via Resend to verify deliverability.
 * Usage: pnpm tsx scripts/test-resend-send.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

if (!process.env.RESEND_API_KEY) {
  console.error(
    "❌ RESEND_API_KEY is not set. This test requires a real API key — add it to .env.local.",
  );
  process.exit(1);
}

async function main() {
  const { sendEmail } = await import("../src/lib/email/smtp-service");

  const now = new Date().toISOString();

  const result = await sendEmail({
    to: "tobiloba.a.salau@gmail.com",
    subject: "Askly Resend test — please ignore",
    html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
  <p style="font-size:15px;color:#374151;">Hello Tobbie,</p>
  <p style="font-size:15px;color:#374151;">This is a test email from Askly via Resend. If you got this, deliverability works.</p>
  <p style="font-size:12px;color:#9ca3af;margin-top:24px;">Sent at ${now}</p>
  <p style="font-size:12px;color:#9ca3af;">&mdash; Askly</p>
</div>`,
    text: `Hello Tobbie,\n\nThis is a test email from Askly via Resend. If you got this, deliverability works.\n\nSent at ${now}\n— Askly`,
  });

  if (result.ok) {
    console.log(
      `✅ Sent. Resend message id: ${result.id}. Check tobiloba.a.salau@gmail.com (inbox AND spam folder).`,
    );
    process.exit(0);
  } else {
    console.error(
      `❌ Failed. Error: ${result.error}. Check API key, sender domain verification, and Resend dashboard logs.`,
    );
    process.exit(1);
  }
}

main();
