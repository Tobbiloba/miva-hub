// Sentry init for the Node.js runtime. Loaded from src/instrumentation.ts.
// No-op unless SENTRY_DSN (or NEXT_PUBLIC_SENTRY_DSN) is set.
import * as Sentry from "@sentry/nextjs";
import { SENTRY_DATA_COLLECTION } from "./sentry.shared";

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    dataCollection: SENTRY_DATA_COLLECTION,
  });
}
