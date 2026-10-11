"use client";

import {
  INDIVIDUAL_PLANS,
  type IndividualPlanKey,
  PREMIUM_YEARLY_SAVINGS_KOBO,
  YEARLY_SAVINGS_KOBO,
  formatNaira,
  getIndividualPlanByName,
  planChangeCreditMs,
} from "lib/billing/plans";
import {
  CheckCircle,
  Clock,
  CreditCard,
  GraduationCap,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
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
    next_payment_date: string | null;
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
  const [loadError, setLoadError] = useState(false);

  const loadStatus = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    fetch("/api/billing/status")
      .then((res) => {
        if (!res.ok) throw new Error(`status ${res.status}`);
        return res.json();
      })
      .then(setStatus)
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  async function handleCheckout(plan: IndividualPlanKey) {
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
        toast.error(data.error || "Failed to start checkout");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
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
        toast.error(data.error || "Failed to cancel");
      }
    } catch {
      toast.error("Something went wrong.");
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

  if (loadError || !status) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold">Couldn&apos;t load your plan</h1>
          <p className="text-muted-foreground">
            Check your connection and try again.
          </p>
          <Button onClick={loadStatus} className="min-h-11">
            Try again
          </Button>
        </div>
      </div>
    );
  }

  const isPaywalled = status.paywalled;
  const hasActiveSub =
    !!status.subscription && status.subscription.status === "active";
  const isCanceled = status.subscription?.cancel_at_period_end;
  // A student who subscribed during the trial is shown their paid plan
  const showTrial = status.in_trial && !hasActiveSub;

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
                    <GraduationCap className="h-5 w-5 text-emerald-500" />
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

          <div className="space-y-3">
            <p className="text-center text-sm text-muted-foreground">
              Your university covers the standard plan. Askly Premium adds
              SIWES, the final-year project companion and 300 voice minutes a
              month.
            </p>
            <PlanCards
              onCheckout={handleCheckout}
              checkoutLoading={checkoutLoading}
              premiumOnly
            />
          </div>

          <div className="text-center">
            <Button
              variant="ghost"
              size="sm"
              className="min-h-11"
              onClick={() => router.push("/")}
            >
              Back to chat
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
                  {showTrial ? (
                    <>
                      <Clock className="h-5 w-5 text-amber-500" />
                      Free Trial
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-5 w-5 text-emerald-500" />
                      {getPlanDisplayName(status.subscription?.plan)}
                    </>
                  )}
                </CardTitle>
                <CardDescription>
                  {showTrial
                    ? `${status.days_left_in_trial} day${status.days_left_in_trial !== 1 ? "s" : ""} remaining`
                    : isCanceled
                      ? `Cancels on ${formatDate(status.subscription!.current_period_end)}`
                      : nextChargeLine(status.subscription!)}
                </CardDescription>
              </div>
              <Badge
                variant={
                  showTrial
                    ? "secondary"
                    : isCanceled
                      ? "destructive"
                      : "default"
                }
              >
                {showTrial ? "Trial" : isCanceled ? "Canceling" : "Active"}
              </Badge>
            </div>
          </CardHeader>

          {hasActiveSub && !isCanceled && (
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-11"
                    disabled={cancelLoading}
                  >
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
                      After that, you&apos;ll lose access until you subscribe
                      again.
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
              <p className="text-sm text-muted-foreground">
                You won&apos;t be charged again. You keep full access until{" "}
                {formatDate(status.subscription!.current_period_end)}; after
                that you can subscribe again from this page.
              </p>
            </CardContent>
          )}
        </Card>

        {/* Plans: subscribe during the trial, or change plan */}
        {(status.in_trial || hasActiveSub) && (
          <>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                {hasActiveSub
                  ? "Change plan. You pay for the new plan now, and your unused time carries over to it."
                  : "Subscribe now to keep uninterrupted access when your trial ends."}
              </p>
            </div>
            <PlanCards
              onCheckout={handleCheckout}
              checkoutLoading={checkoutLoading}
              current={
                hasActiveSub
                  ? {
                      plan: status.subscription!.plan,
                      periodEnd: status.subscription!.current_period_end,
                    }
                  : undefined
              }
            />
          </>
        )}

        <div className="text-center">
          <Button
            variant="ghost"
            size="sm"
            className="min-h-11"
            onClick={() => router.push("/")}
          >
            Back to chat
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
  current,
  premiumOnly = false,
}: {
  onCheckout: (plan: IndividualPlanKey) => void;
  checkoutLoading: string | null;
  /** The student's current paid plan, for "Current plan" and the credit note */
  current?: { plan: string; periodEnd: string };
  /** Only offer Premium (the university already covers the standard plan) */
  premiumOnly?: boolean;
}) {
  const currentDef = getIndividualPlanByName(current?.plan);
  const [yearly, setYearly] = useState(currentDef?.interval === "yearly");
  const keys: IndividualPlanKey[] = premiumOnly
    ? [yearly ? "premium_yearly" : "premium_monthly"]
    : yearly
      ? ["yearly", "premium_yearly"]
      : ["monthly", "premium_monthly"];

  return (
    <div className="space-y-4">
      <div
        role="radiogroup"
        aria-label="Billing period"
        className="mx-auto grid w-full max-w-xs grid-cols-2 rounded-full border p-1"
      >
        {(
          [
            [false, "Monthly"],
            [true, "Yearly"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={label}
            type="button"
            role="radio"
            aria-checked={yearly === value}
            onClick={() => setYearly(value)}
            className={`min-h-11 rounded-full text-sm font-medium transition-colors ${
              yearly === value
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div
        className={`grid grid-cols-1 gap-4 ${premiumOnly ? "" : "sm:grid-cols-2"}`}
      >
        {keys.map((key) => {
          const plan = INDIVIDUAL_PLANS[key];
          const premium = plan.tier === "premium";
          const isCurrent = currentDef?.key === key;
          const perMonth =
            plan.interval === "yearly" ? Math.round(plan.priceKobo / 12) : null;
          const savings =
            plan.interval === "yearly"
              ? premium
                ? PREMIUM_YEARLY_SAVINGS_KOBO
                : YEARLY_SAVINGS_KOBO
              : 0;
          // Unused time on the current plan, as days of this one
          const creditDays =
            current && currentDef && !isCurrent
              ? Math.floor(
                  planChangeCreditMs({
                    now: new Date(),
                    oldPeriodEnd: new Date(current.periodEnd),
                    oldPriceKobo: currentDef.priceKobo,
                    oldInterval: currentDef.interval,
                    newPriceKobo: plan.priceKobo,
                    newInterval: plan.interval,
                  }) / 86_400_000,
                )
              : 0;
          const action = isCurrent
            ? "Current plan"
            : current
              ? `Switch to ${premium ? "Premium" : "Askly"}`
              : premium
                ? "Get Premium"
                : `Choose ${plan.interval === "yearly" ? "Yearly" : "Monthly"}`;
          return (
            <Card
              key={key}
              className={`border-2 ${premium ? "border-primary" : ""}`}
            >
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    {premium && (
                      <Sparkles className="h-4 w-4" aria-hidden="true" />
                    )}
                    {premium ? "Askly Premium" : "Askly"}
                  </CardTitle>
                  {savings > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      Save {formatNaira(savings)}
                    </Badge>
                  )}
                </div>
                <CardDescription>
                  <span className="text-2xl font-bold text-foreground">
                    {formatNaira(plan.priceKobo)}
                  </span>
                  <span className="text-muted-foreground">
                    /{plan.periodLabel}
                  </span>
                  {perMonth && (
                    <span className="block text-xs">
                      Effectively {formatNaira(perMonth)}/month
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="mb-4 space-y-2 text-sm text-muted-foreground">
                  {plan.features.slice(0, 4).map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <CheckCircle
                        className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500"
                        aria-hidden="true"
                      />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  className="min-h-11 w-full"
                  variant={premium ? "default" : "outline"}
                  onClick={() => onCheckout(key)}
                  disabled={!!checkoutLoading || isCurrent}
                >
                  {checkoutLoading === key ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {action}
                </Button>
                {creditDays > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Your unused {currentDef?.displayName} time adds about{" "}
                    {creditDays} day{creditDays === 1 ? "" : "s"} to this plan.
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── Helpers ───

function getPlanDisplayName(plan?: string): string {
  const def = getIndividualPlanByName(plan);
  if (!def) return plan || "Askly";
  return `${def.displayName} - ${formatNaira(def.priceKobo)}/${def.periodLabel}`;
}

/** "Next charge on 10 Nov", plus the extra days a plan change carried over */
function nextChargeLine(sub: {
  current_period_end: string;
  next_payment_date: string | null;
}): string {
  const next = sub.next_payment_date ?? sub.current_period_end;
  // Credit is exact to the second (e.g. 5.997 days), so round, don't floor
  const extraDays = Math.round(
    (new Date(sub.current_period_end).getTime() - new Date(next).getTime()) /
      86_400_000,
  );
  return extraDays >= 1
    ? `Next charge on ${formatDate(next)} · ${extraDays} extra day${extraDays === 1 ? "" : "s"} carried over from your previous plan`
    : `Next charge on ${formatDate(next)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
