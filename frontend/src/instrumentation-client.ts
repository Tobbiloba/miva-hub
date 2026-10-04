// Sentry init for the browser. No-op unless NEXT_PUBLIC_SENTRY_DSN is set
// at build time.
import * as Sentry from "@sentry/nextjs";
import { SENTRY_DATA_COLLECTION } from "../sentry.shared";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment:
      process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV,
    tracesSampleRate: Number(
      process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? 0.1,
    ),
    dataCollection: SENTRY_DATA_COLLECTION,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
