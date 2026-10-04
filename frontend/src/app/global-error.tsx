"use client";

import * as Sentry from "@sentry/nextjs";
import NextError from "next/error";
import { useEffect } from "react";

// Last-resort boundary for errors thrown in the root layout. Replaces the
// whole document, so it must render its own <html>/<body>.
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    // No-op when Sentry is not initialised (no NEXT_PUBLIC_SENTRY_DSN).
    Sentry.captureException(error);
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        {/* App Router does not expose a status code for errors, so pass 0. */}
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
