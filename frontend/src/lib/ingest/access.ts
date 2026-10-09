import "server-only";

import { checkPaidAccess } from "lib/billing/access";
import { pgDb } from "lib/db/pg/db.pg";
import { UserSchema } from "lib/db/pg/schema.pg";
import { eq } from "drizzle-orm";

/**
 * Capture spends extraction + embedding money, so it sits behind the same
 * paywall as chat. Volunteers are exempt: they collect shared course content
 * for everyone (their captures go to moderation, not just their own chat).
 */
export async function checkCaptureAccess(
  userId: string,
): Promise<{ allowed: true } | { allowed: false; reason: string }> {
  const [user] = await pgDb
    .select({ isVolunteer: UserSchema.isVolunteer })
    .from(UserSchema)
    .where(eq(UserSchema.id, userId))
    .limit(1);
  if (user?.isVolunteer) return { allowed: true };
  return checkPaidAccess(userId);
}
