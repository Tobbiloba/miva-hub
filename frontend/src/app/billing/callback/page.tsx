"use client";

import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "ui/button";

export default function BillingCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const reference = searchParams.get("reference") || searchParams.get("trxref");
  const [state, setState] = useState<"verifying" | "success" | "error">(
    "verifying",
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!reference) {
      setState("error");
      setMessage("No payment reference found.");
      return;
    }

    // Poll billing status to confirm subscription is active
    let attempts = 0;
    const maxAttempts = 10;

    async function checkSubscription() {
      try {
        const res = await fetch("/api/billing/status");
        const data = await res.json();

        if (data.subscription?.status === "active") {
          setState("success");
          setMessage("Your subscription is active!");
          return;
        }

        attempts++;
        if (attempts >= maxAttempts) {
          // Subscription might still be processing via webhook
          setState("success");
          setMessage(
            "Payment received! Your subscription is being activated. You may need to refresh in a moment.",
          );
          return;
        }

        // Wait 2 seconds and try again
        setTimeout(checkSubscription, 2000);
      } catch {
        attempts++;
        if (attempts >= maxAttempts) {
          setState("error");
          setMessage(
            "Could not verify your subscription. Please check your billing page.",
          );
        } else {
          setTimeout(checkSubscription, 2000);
        }
      }
    }

    checkSubscription();
  }, [reference]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md text-center space-y-6">
        {state === "verifying" && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <h1 className="text-2xl font-bold">
              Activating your subscription...
            </h1>
            <p className="text-muted-foreground">
              Please wait while we confirm your payment.
            </p>
          </>
        )}

        {state === "success" && (
          <>
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
            <h1 className="text-2xl font-bold">You&apos;re all set!</h1>
            <p className="text-muted-foreground">{message}</p>
            <Button onClick={() => router.push("/student")} className="mt-4">
              Go to Dashboard
            </Button>
          </>
        )}

        {state === "error" && (
          <>
            <XCircle className="h-12 w-12 text-destructive mx-auto" />
            <h1 className="text-2xl font-bold">Something went wrong</h1>
            <p className="text-muted-foreground">{message}</p>
            <div className="flex gap-3 justify-center mt-4">
              <Button variant="outline" onClick={() => router.push("/billing")}>
                Try again
              </Button>
              <Button onClick={() => router.push("/student")}>
                Go to Dashboard
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
