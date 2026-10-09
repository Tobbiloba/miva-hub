"use client";

import { CheckCircle, Clock, Loader2, XCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "ui/button";

type VerifyState = "active" | "pending" | "failed" | "unresolved";
type PageState = "verifying" | "success" | "processing" | "failed" | "error";

const MAX_ATTEMPTS = 10;
const POLL_MS = 3000;

/**
 * Paystack redirects here after checkout. We ask the server to verify the
 * reference with Paystack and apply it (/api/billing/verify) — the same
 * code path as the webhook — and only show success when the server says
 * the subscription is active. Anything else gets an honest state with the
 * reference so support can trace it.
 */
export default function BillingCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const reference = searchParams.get("reference") || searchParams.get("trxref");
  const [state, setState] = useState<PageState>("verifying");

  useEffect(() => {
    if (!reference) {
      setState("error");
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;

    async function verify() {
      attempts++;
      let result: VerifyState | null = null;
      try {
        const res = await fetch("/api/billing/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference }),
        });
        if (res.ok) {
          result = ((await res.json()) as { state: VerifyState }).state;
        } else if (res.status === 404 || res.status === 400) {
          result = "unresolved";
        }
      } catch {
        // Network blip — treated like "pending" and retried below.
      }
      if (cancelled) return;

      if (result === "active") return setState("success");
      if (result === "failed") return setState("failed");
      if (result === "unresolved") return setState("error");

      // Still pending (bank transfer / USSD settle late) — keep checking for
      // a while, then say so plainly instead of guessing.
      if (attempts >= MAX_ATTEMPTS) return setState("processing");
      timer = setTimeout(verify, POLL_MS);
    }

    verify();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [reference]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md text-center space-y-6" aria-live="polite">
        {state === "verifying" && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <h1 className="text-2xl font-bold">Confirming your payment...</h1>
            <p className="text-muted-foreground">
              This usually takes a few seconds. Please keep this page open.
            </p>
          </>
        )}

        {state === "success" && (
          <>
            <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto" />
            <h1 className="text-2xl font-bold">You&apos;re all set!</h1>
            <p className="text-muted-foreground">
              Your subscription is active. A receipt is on its way to your
              email.
            </p>
            <Button onClick={() => router.push("/")} className="mt-4 min-h-11">
              Start studying
            </Button>
          </>
        )}

        {state === "processing" && (
          <>
            <Clock className="h-12 w-12 text-amber-500 mx-auto" />
            <h1 className="text-2xl font-bold">Payment still processing</h1>
            <p className="text-muted-foreground">
              We haven&apos;t received confirmation from Paystack yet. Bank
              transfers and USSD payments can take a few minutes. Your plan
              activates automatically once it&apos;s confirmed — check your
              billing page shortly.
            </p>
            <p className="text-sm text-muted-foreground">
              If you were charged and your plan isn&apos;t active within an
              hour, contact support with reference{" "}
              <span className="font-mono text-foreground">{reference}</span>.
            </p>
            <div className="flex gap-3 justify-center mt-4">
              <Button
                variant="outline"
                className="min-h-11"
                onClick={() => window.location.reload()}
              >
                Check again
              </Button>
              <Button
                className="min-h-11"
                onClick={() => router.push("/billing")}
              >
                Billing page
              </Button>
            </div>
          </>
        )}

        {state === "failed" && (
          <>
            <XCircle className="h-12 w-12 text-destructive mx-auto" />
            <h1 className="text-2xl font-bold">Payment not completed</h1>
            <p className="text-muted-foreground">
              Paystack reports this payment as unsuccessful, so you weren&apos;t
              charged for a subscription. You can try again.
            </p>
            <Button
              className="mt-4 min-h-11"
              onClick={() => router.push("/billing")}
            >
              Try again
            </Button>
          </>
        )}

        {state === "error" && (
          <>
            <XCircle className="h-12 w-12 text-destructive mx-auto" />
            <h1 className="text-2xl font-bold">
              We couldn&apos;t confirm this payment
            </h1>
            <p className="text-muted-foreground">
              {reference ? (
                <>
                  If you were charged, contact support with reference{" "}
                  <span className="font-mono text-foreground">{reference}</span>{" "}
                  and we&apos;ll sort it out.
                </>
              ) : (
                "No payment reference was found in the link."
              )}
            </p>
            <div className="flex gap-3 justify-center mt-4">
              <Button
                variant="outline"
                className="min-h-11"
                onClick={() => router.push("/billing")}
              >
                Billing page
              </Button>
              <Button className="min-h-11" onClick={() => router.push("/")}>
                Start studying
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
