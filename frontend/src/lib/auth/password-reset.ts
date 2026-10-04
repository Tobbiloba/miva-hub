import "server-only";

import { eq } from "drizzle-orm";

import { auth } from "@/lib/auth/server";
import { pgDb as db } from "@/lib/db/pg/db.pg";
import { UserSchema } from "@/lib/db/pg/schema.pg";

export interface PasswordResetResult {
  /** True when the account exists and the email was handed to the mailer.
   * Callers that answer anonymous requests must NOT reveal this. */
  sent: boolean;
}

/**
 * Send a password reset link for the account behind `email` (if any) via
 * better-auth's built-in flow (token in the `verification` table, password
 * hashed with better-auth's own hasher on reset). Single code path shared by
 * the public "forgot password" route and the AI support agent. Never throws;
 * never reveals account existence.
 */
export async function sendPasswordResetEmail(
  email: string,
): Promise<PasswordResetResult> {
  const normalized = email.toLowerCase().trim();

  const [user] = await db
    .select({ id: UserSchema.id })
    .from(UserSchema)
    .where(eq(UserSchema.email, normalized))
    .limit(1);
  if (!user) return { sent: false };

  try {
    await auth.api.requestPasswordReset({ body: { email: normalized } });
    return { sent: true };
  } catch (error) {
    console.error("Error sending password reset email:", error);
    return { sent: false };
  }
}
