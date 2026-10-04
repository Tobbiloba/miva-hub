import "server-only";

import fs from "fs";
import path from "path";

import { sendEmail } from "@/lib/email/smtp-service";

/**
 * better-auth `emailAndPassword.sendResetPassword`. better-auth stores the
 * token in the `verification` table; we link straight to our confirm page,
 * which posts it back to better-auth's /reset-password via our API route.
 * Throws when the mail can't be sent so callers can report it.
 */
export async function sendResetPasswordEmail({
  user,
  token,
}: {
  user: { email: string; name?: string | null };
  token: string;
}): Promise<void> {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "http://localhost:4001";
  // `email` is display-only on the confirm page; the token alone authorizes.
  const resetLink = `${appUrl}/reset-password/confirm?token=${encodeURIComponent(token)}&email=${encodeURIComponent(user.email)}`;

  const template = fs.readFileSync(
    path.join(process.cwd(), "src/lib/email/templates/password-reset.html"),
    "utf-8",
  );
  const html = template
    .replace("{{userName}}", user.name || "User")
    .replace(/{{resetLink}}/g, resetLink);

  await sendEmail({
    to: user.email,
    subject: "Reset Your Askly Password",
    html,
  });
}
