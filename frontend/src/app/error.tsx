"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-destructive/50 mb-4">500</h1>
        <h2 className="text-4xl font-bold mb-4">Something went wrong</h2>
        <p className="text-xl text-muted-foreground mb-8 max-w-md">
          {error.message || "An unexpected error occurred. Please try again."}
        </p>

        <div className="flex gap-4 justify-center flex-wrap">
          <Button size="lg" onClick={() => reset()}>
            Try Again
          </Button>
          <Button size="lg" variant="outline" onClick={() => (window.location.href = "/")}>
            Go to Home
          </Button>
        </div>

        {error.digest && (
          <p className="text-xs text-muted-foreground mt-8 font-mono">
            Error ID: {error.digest}
          </p>
        )}

        <p className="text-muted-foreground mt-12">
          Need help? <a href="mailto:support@miva-hub.com" className="text-primary hover:underline">Contact support</a>
        </p>
      </div>
    </div>
  );
}
