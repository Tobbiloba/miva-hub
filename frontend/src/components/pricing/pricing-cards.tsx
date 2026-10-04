"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  INDIVIDUAL_PLANS,
  type IndividualPlanKey,
  PLAN_FEATURES,
  YEARLY_SAVINGS_KOBO,
  formatNaira,
} from "@/lib/billing/plans";
import { CheckCircle2, Crown, Loader2, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

interface PricingCardsProps {
  isLoggedIn: boolean;
  /** Student already has access via a subscription — no checkout. */
  hasActiveSubscription: boolean;
}

/**
 * Public pricing cards. Plans and prices come from lib/billing/plans (the
 * same source the checkout validates against), and checkout goes through
 * the live /api/billing flow.
 */
export function PricingCards({
  isLoggedIn,
  hasActiveSubscription,
}: PricingCardsProps) {
  const [loading, setLoading] = useState<IndividualPlanKey | null>(null);
  const router = useRouter();

  const handleSubscribe = async (plan: IndividualPlanKey) => {
    if (!isLoggedIn) {
      router.push("/sign-in");
      return;
    }

    setLoading(plan);
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        toast.error("Please sign in to subscribe");
        router.push("/sign-in");
        return;
      }
      if (!response.ok || !data.authorization_url) {
        throw new Error(data.error || "Failed to start checkout");
      }

      window.location.href = data.authorization_url;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to start checkout",
      );
      setLoading(null);
    }
  };

  const plans = [INDIVIDUAL_PLANS.monthly, INDIVIDUAL_PLANS.yearly];

  return (
    <div className="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
      {plans.map((plan) => {
        const isYearly = plan.key === "yearly";
        const Icon = isYearly ? Crown : Zap;
        return (
          <Card
            key={plan.key}
            className={`bg-card border-border/40 relative ${
              isYearly ? "md:shadow-xl ring-2 ring-primary" : ""
            }`}
          >
            {isYearly && (
              <div className="absolute -top-3 right-4">
                <Badge className="bg-primary text-primary-foreground border-0">
                  Save {formatNaira(YEARLY_SAVINGS_KOBO)}
                </Badge>
              </div>
            )}

            <CardHeader>
              <div className="flex items-center gap-2">
                <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                <CardTitle className="text-2xl">{plan.displayName}</CardTitle>
              </div>
              <CardDescription className="text-base">
                {plan.description}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">
                  {formatNaira(plan.priceKobo)}
                </span>
                <span className="text-muted-foreground">
                  /{plan.periodLabel}
                </span>
              </div>

              <Button
                className="w-full min-h-11"
                size="lg"
                onClick={() => handleSubscribe(plan.key)}
                disabled={loading !== null || hasActiveSubscription}
              >
                {loading === plan.key ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Redirecting to Paystack...
                  </>
                ) : hasActiveSubscription ? (
                  "You're subscribed"
                ) : (
                  `Choose ${isYearly ? "Yearly" : "Monthly"}`
                )}
              </Button>

              <ul className="space-y-3">
                {PLAN_FEATURES.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <CheckCircle2
                      className="h-4 w-4 text-primary mt-0.5 flex-shrink-0"
                      aria-hidden="true"
                    />
                    <span className="text-sm text-muted-foreground">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
