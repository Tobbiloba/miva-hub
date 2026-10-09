import "server-only";

import { and, eq, isNull } from "drizzle-orm";
import { pgDb } from "lib/db/pg/db.pg";
import { ExtensionTokenSchema } from "lib/db/pg/schema.pg";

/**
 * Revoke every live extension token of a user. Called when the password
 * changes or is reset: a token is a 90-day credential, and a password change
 * is how a user locks out whoever might hold one.
 */
export async function revokeAllExtensionTokens(userId: string): Promise<void> {
  await pgDb
    .update(ExtensionTokenSchema)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(ExtensionTokenSchema.userId, userId),
        isNull(ExtensionTokenSchema.revokedAt),
      ),
    );
}
