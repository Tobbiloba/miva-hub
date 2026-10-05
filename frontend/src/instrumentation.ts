import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
    // Refuse to boot a production server with config that would take fake
    // payments or break auth (see lib/env-check.ts).
    const { checkEnv } = await import("./lib/env-check");
    checkEnv();
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

// Reports errors thrown in server components, route handlers and middleware.
// Safe when Sentry was never initialised: capture is a no-op without a client.
export const onRequestError = Sentry.captureRequestError;
