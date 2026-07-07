import "server-only";

import { randomBytes } from "crypto";
import fs from "fs";
import path from "path";

import { eq } from "drizzle-orm";

import { storeResetToken } from "@/lib/auth/reset-token-store";
import { pgDb as db } from "@/lib/db/pg/db.pg";
import { UserSchema } from "@/lib/db/pg/schema.pg";
import { sendEmail } from "@/lib/email/smtp-service";

export interface PasswordResetResult {
  /** True when the account exists and the email was handed to the mailer.
   * Callers that answer anonymous requests must NOT reveal this. */
  sent: boolean;
}

/**
 * Generate a reset token for the account behind `email` (if any) and send the
 * reset link. Single code path shared by the public "forgot password" route
 * and the AI support agent. Never throws; never reveals account existence.
 */
export async function sendPasswordResetEmail(
  email: string,
): Promise<PasswordResetResult> {
  const normalized = email.toLowerCase().trim();

  const [user] = await db
    .select({ email: UserSchema.email, name: UserSchema.name })
    .from(UserSchema)
    .where(eq(UserSchema.email, normalized))
    .limit(1);
  if (!user) return { sent: false };

  const resetToken = randomBytes(32).toString("hex");
  storeResetToken(resetToken, normalized);

  try {
    const resetTemplate = fs.readFileSync(
      path.join(process.cwd(), "src/lib/email/templates/password-reset.html"),
      "utf-8",
    );
    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:4001"}/reset-password/confirm?token=${resetToken}&email=${encodeURIComponent(normalized)}`;
    const resetHtml = resetTemplate
      .replace("{{userName}}", user.name || "User")
      .replace(/{{resetLink}}/g, resetLink);

    await sendEmail({
      to: user.email,
      subject: "Reset Your Askly Password",
      html: resetHtml,
    });
    return { sent: true };
  } catch (error) {
    console.error("Error sending password reset email:", error);
    // Token is stored either way — the user can retry from the sign-in page
    return { sent: false };
  }
}
