"use client";

import {
  CheckCircle,
  Clock,
  CreditCard,
  GraduationCap,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "ui/alert-dialog";
import { Badge } from "ui/badge";
import { Button } from "ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "ui/card";

interface BillingStatus {
  in_trial: boolean;
  trial_ends_at: string | null;
  days_left_in_trial: number;
  subscription: {
    status: string;
    plan: string;
    current_period_end: string;
    cancel_at_period_end: boolean;
  } | null;
  covered_by_university: boolean;
  paywalled: boolean;
}

export default function BillingPage() {
  const router = useRouter();
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  useEffect(() => {
    fetch("/api/billing/status")
      .then((res) => res.json())
      .then(setStatus)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleCheckout(plan: "monthly" | "yearly") {
    setCheckoutLoading(plan);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        alert(data.error || "Failed to start checkout");
      }
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setCheckoutLoading(null);
    }
  }

  async function handleCancel() {
    setCancelLoading(true);
    try {
      const res = await fetch("/api/billing/cancel", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        // Refresh status
        const updated = await fetch("/api/billing/status").then((r) =>
          r.json(),
        );
        setStatus(updated);
      } else {
        alert(data.error || "Failed to cancel");
      }
    } catch {
      alert("Something went wrong.");
    } finally {
      setCancelLoading(false);
    }
  }

  function handleLogout() {
    window.location.href = "/api/auth/sign-out";
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!status) return null;

  const isPaywalled = status.paywalled;
  const hasActiveSub =
    !!status.subscription && status.subscription.status === "active";
  const isCanceled = status.subscription?.cancel_at_period_end;

  // ─── Covered by university: no personal payment needed ───
  if (status.covered_by_university) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-2xl space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Your Plan</h1>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-green-500" />
                    Covered by your university
                  </CardTitle>
                  <CardDescription>
                    {status.subscription?.current_period_end
                      ? `Your university's subscription covers you until ${formatDate(status.subscription.current_period_end)}.`
                      : "Your university's subscription covers your access."}{" "}
                    No payment is needed from you.
                  </CardDescription>
                </div>
                <Badge>Active</Badge>
              </div>
            </CardHeader>
          </Card>

          <div className="text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/student")}
            >
              Back to dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Paywalled state: trial expired, no subscription ───
  if (isPaywalled) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-2xl space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">
              Your trial has ended
            </h1>
            <p className="text-muted-foreground text-lg">
              Choose a plan to continue using Askly.
            </p>
          </div>

          <PlanCards
            onCheckout={handleCheckout}
            checkoutLoading={checkoutLoading}
          />

          <div className="text-center">
            <button
              onClick={handleLogout}
              className="text-sm text-muted-foreground hover:text-foreground underline"
            >
              Log out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Active state: trial or subscription ───
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Your Plan</h1>
        </div>

        {/* Current plan info */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {status.in_trial ? (
                    <>
                      <Clock className="h-5 w-5 text-amber-500" />
                      Free Trial
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-5 w-5 text-green-500" />
                      {getPlanDisplayName(status.subscription?.plan)}
                    </>
                  )}
                </CardTitle>
                <CardDescription>
                  {status.in_trial
                    ? `${status.days_left_in_trial} day${status.days_left_in_trial !== 1 ? "s" : ""} remaining`
                    : isCanceled
                      ? `Cancels on ${formatDate(status.subscription!.current_period_end)}`
                      : `Next charge on ${formatDate(status.subscription!.current_period_end)}`}
                </CardDescription>
              </div>
              <Badge
                variant={
                  status.in_trial
                    ? "secondary"
                    : isCanceled
                      ? "destructive"
                      : "default"
                }
              >
                {status.in_trial
                  ? "Trial"
                  : isCanceled
                    ? "Canceling"
                    : "Active"}
              </Badge>
            </div>
          </CardHeader>

          {hasActiveSub && !isCanceled && (
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={cancelLoading}>
                    {cancelLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Cancel subscription
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel subscription?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Your subscription will remain active until{" "}
                      {formatDate(status.subscription!.current_period_end)}.
                      After that, you'll lose access until you subscribe again.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep subscription</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCancel}>
                      Yes, cancel
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          )}

          {isCanceled && (
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Your subscription ends on{" "}
                {formatDate(status.subscription!.current_period_end)}.
                Re-subscribe to keep access.
              </p>
              <PlanCards
                onCheckout={handleCheckout}
                checkoutLoading={checkoutLoading}
                compact
              />
            </CardContent>
          )}
        </Card>

        {/* Upgrade cards for trial users */}
        {status.in_trial && (
          <>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Upgrade now to keep uninterrupted access when your trial ends.
              </p>
            </div>
            <PlanCards
              onCheckout={handleCheckout}
              checkoutLoading={checkoutLoading}
            />
          </>
        )}

        <div className="text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/student")}
          >
            Back to dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Plan cards component ───

function PlanCards({
  onCheckout,
  checkoutLoading,
  compact,
}: {
  onCheckout: (plan: "monthly" | "yearly") => void;
  checkoutLoading: string | null;
  compact?: boolean;
}) {
  return (
    <div
      className={`grid gap-4 ${compact ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2"}`}
    >
      <Card className={compact ? "" : "border-2"}>
        <CardHeader className={compact ? "pb-2" : ""}>
          <CardTitle className={compact ? "text-base" : "text-xl"}>
            Monthly
          </CardTitle>
          <CardDescription>
            <span className="text-2xl font-bold text-foreground">₦3,000</span>
            <span className="text-muted-foreground">/month</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!compact && (
            <ul className="space-y-2 text-sm text-muted-foreground mb-4">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" /> Full AI chat
                access
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" /> All course
                materials
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" /> Flashcards &
                quizzes
              </li>
            </ul>
          )}
          <Button
            className="w-full"
            onClick={() => onCheckout("monthly")}
            disabled={!!checkoutLoading}
          >
            {checkoutLoading === "monthly" ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Choose Monthly
          </Button>
        </CardContent>
      </Card>

      <Card className={compact ? "" : "border-2 border-primary"}>
        <CardHeader className={compact ? "pb-2" : ""}>
          <div className="flex items-center justify-between">
            <CardTitle className={compact ? "text-base" : "text-xl"}>
              Yearly
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              Save ₦6,000
            </Badge>
          </div>
          <CardDescription>
            <span className="text-2xl font-bold text-foreground">₦30,000</span>
            <span className="text-muted-foreground">/year</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!compact && (
            <ul className="space-y-2 text-sm text-muted-foreground mb-4">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" /> Everything in
                Monthly
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" /> Effective
                ₦2,500/month
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" /> Best value
              </li>
            </ul>
          )}
          <Button
            className="w-full"
            variant="default"
            onClick={() => onCheckout("yearly")}
            disabled={!!checkoutLoading}
          >
            {checkoutLoading === "yearly" ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Choose Yearly
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Helpers ───

function getPlanDisplayName(plan?: string): string {
  if (!plan) return "Askly";
  if (plan.includes("MONTHLY") || plan.includes("monthly"))
    return "Monthly - ₦3,000/mo";
  if (plan.includes("YEARLY") || plan.includes("yearly"))
    return "Yearly - ₦30,000/yr";
  return plan;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
