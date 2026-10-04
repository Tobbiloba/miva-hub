import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * Constant-time string comparison. Both sides are hashed first so the
 * comparison never leaks the secret's length and `timingSafeEqual` always
 * gets equal-length buffers.
 */
export function safeEqual(
  given: string | null | undefined,
  expected: string | null | undefined,
): boolean {
  if (!given || !expected) return false;
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

/**
 * Meta (WhatsApp Cloud API) webhook signature: `X-Hub-Signature-256:
 * sha256=<hex HMAC-SHA256 of the raw request body keyed by the app secret>`.
 */
export function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  appSecret: string | null | undefined,
): boolean {
  if (!signatureHeader || !appSecret) return false;
  const match = /^sha256=([0-9a-f]{64})$/i.exec(signatureHeader.trim());
  if (!match) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody).digest();
  const given = Buffer.from(match[1], "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}
