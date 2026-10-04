/**
 * Fixed-window rate limiter backed by Postgres (`rate_limit_bucket`).
 *
 * Counters live in the database so limits hold across every app instance
 * (Vercel functions, multiple containers). Each check is one atomic upsert.
 */

import { pgDb } from "@/lib/db/pg/db.pg";
import { sql } from "drizzle-orm";
import logger from "logger";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Seconds until the current window resets */
  retryAfterSec: number;
}

/**
 * @param key unique identifier, e.g. `chat:${userId}`
 * @param limit max requests per window
 * @param windowSec window length in seconds
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSec: number,
): Promise<RateLimitResult> {
  try {
    // Start a new window when the stored one has expired, otherwise increment.
    const result = await pgDb.execute(sql`
      INSERT INTO rate_limit_bucket (key, window_start, count)
      VALUES (${key}, now(), 1)
      ON CONFLICT (key) DO UPDATE SET
        count = CASE
          WHEN rate_limit_bucket.window_start <= now() - make_interval(secs => ${windowSec})
          THEN 1 ELSE rate_limit_bucket.count + 1 END,
        window_start = CASE
          WHEN rate_limit_bucket.window_start <= now() - make_interval(secs => ${windowSec})
          THEN now() ELSE rate_limit_bucket.window_start END
      RETURNING count,
        GREATEST(0, CEIL(EXTRACT(EPOCH FROM
          (window_start + make_interval(secs => ${windowSec}) - now()))))::int AS retry_after
    `);
    const row = result.rows[0] as { count: number; retry_after: number };
    const count = Number(row.count);
    const retryAfterSec = Math.max(1, Number(row.retry_after));
    if (count > limit) {
      return { allowed: false, remaining: 0, retryAfterSec };
    }
    return { allowed: true, remaining: limit - count, retryAfterSec };
  } catch (error) {
    // The request's own DB work will fail too if Postgres is down; don't turn
    // a limiter hiccup into a second, different error for the caller.
    logger.error(`Rate limit check failed for ${key}:`, error);
    return { allowed: true, remaining: limit, retryAfterSec: windowSec };
  }
}

/** Standard 429 response with Retry-After header */
export function rateLimitResponse(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({
      error: "Too many requests. Please slow down and try again shortly.",
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(result.retryAfterSec),
      },
    },
  );
}

/** Best-effort client IP from proxy headers (for unauthenticated endpoints). */
export function getClientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
