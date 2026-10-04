import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { auth } from "auth/server";
import { and, eq, gt, isNull } from "drizzle-orm";
import { pgDb } from "lib/db/pg/db.pg";
import { ExtensionTokenSchema } from "lib/db/pg/schema.pg";
import { headers } from "next/headers";

/**
 * Credentials for the Askly Capture browser extension.
 *
 * The extension used to replay the web session cookie from a service worker,
 * which browsers strip (Cookie is a forbidden fetch header) and which could
 * never be revoked. It now holds a dedicated bearer token: random, stored only
 * as a sha256 hash, expiring, and revoked on logout.
 */

const TOKEN_PREFIX = "askly_ext_";
const TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000;
// Avoid a write on every request; last-used precision of a few minutes is enough.
const LAST_USED_WRITE_INTERVAL_MS = 5 * 60 * 1000;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Mint a token for a user. The raw value is returned once and never stored. */
export async function issueExtensionToken(
  userId: string,
  label: string | null,
): Promise<{ token: string; expiresAt: Date }> {
  const token = `${TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
  await pgDb.insert(ExtensionTokenSchema).values({
    userId,
    tokenHash: hashToken(token),
    label: label?.slice(0, 100) ?? null,
    expiresAt,
  });
  return { token, expiresAt };
}

function bearerToken(authorization: string | null): string | null {
  if (!authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice("Bearer ".length).trim();
  return token.startsWith(TOKEN_PREFIX) ? token : null;
}

/** Resolve a live (unrevoked, unexpired) token to its user id. */
async function resolveExtensionToken(token: string): Promise<string | null> {
  const [row] = await pgDb
    .select({
      id: ExtensionTokenSchema.id,
      userId: ExtensionTokenSchema.userId,
      lastUsedAt: ExtensionTokenSchema.lastUsedAt,
    })
    .from(ExtensionTokenSchema)
    .where(
      and(
        eq(ExtensionTokenSchema.tokenHash, hashToken(token)),
        isNull(ExtensionTokenSchema.revokedAt),
        gt(ExtensionTokenSchema.expiresAt, new Date()),
      ),
    )
    .limit(1);
  if (!row) return null;

  const now = Date.now();
  if (
    !row.lastUsedAt ||
    now - row.lastUsedAt.getTime() > LAST_USED_WRITE_INTERVAL_MS
  ) {
    await pgDb
      .update(ExtensionTokenSchema)
      .set({ lastUsedAt: new Date(now) })
      .where(eq(ExtensionTokenSchema.id, row.id));
  }
  return row.userId;
}

/**
 * The user behind an ingest request: an extension bearer token, or the
 * regular web session. Returns null when neither is valid.
 */
export async function getIngestUserId(): Promise<string | null> {
  const requestHeaders = await headers();
  const token = bearerToken(requestHeaders.get("authorization"));
  if (token) return resolveExtensionToken(token);

  const session = await auth.api.getSession({ headers: requestHeaders });
  return session?.user?.id ?? null;
}

/** Revoke the bearer token presented on this request (extension logout). */
export async function revokePresentedExtensionToken(): Promise<boolean> {
  const token = bearerToken((await headers()).get("authorization"));
  if (!token) return false;
  const result = await pgDb
    .update(ExtensionTokenSchema)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(ExtensionTokenSchema.tokenHash, hashToken(token)),
        isNull(ExtensionTokenSchema.revokedAt),
      ),
    );
  return (result.rowCount ?? 0) > 0;
}
