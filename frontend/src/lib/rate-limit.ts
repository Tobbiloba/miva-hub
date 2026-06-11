/**
 * Simple in-memory fixed-window rate limiter.
 *
 * Suitable for the current single-instance Node deployment (next start in
 * Docker). If the frontend ever scales to multiple instances or serverless,
 * replace the store with Redis/Postgres.
 */

interface WindowEntry {
  windowStart: number;
  count: number;
}

const store = new Map<string, WindowEntry>();

// Prevent unbounded growth: prune expired entries periodically.
const MAX_ENTRIES = 50_000;

function prune(windowMs: number) {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now - entry.windowStart >= windowMs) {
      store.delete(key);
    }
  }
}

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
export function checkRateLimit(
  key: string,
  limit: number,
  windowSec: number,
): RateLimitResult {
  const now = Date.now();
  const windowMs = windowSec * 1000;

  if (store.size > MAX_ENTRIES) {
    prune(windowMs);
  }

  const entry = store.get(key);

  if (!entry || now - entry.windowStart >= windowMs) {
    store.set(key, { windowStart: now, count: 1 });
    return { allowed: true, remaining: limit - 1, retryAfterSec: windowSec };
  }

  entry.count += 1;
  const retryAfterSec = Math.ceil((entry.windowStart + windowMs - now) / 1000);

  if (entry.count > limit) {
    return { allowed: false, remaining: 0, retryAfterSec };
  }

  return { allowed: true, remaining: limit - entry.count, retryAfterSec };
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
