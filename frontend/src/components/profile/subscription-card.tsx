"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { format } from "date-fns";
import { CheckCircle2, Clock, CreditCard } from "lucide-react";

interface SubscriptionCardProps {
  subscription: any;
  plan: any;
}

export function SubscriptionCard({
  subscription,
  plan,
}: SubscriptionCardProps) {
  const status = subscription.status;
  const isCancelled = subscription.cancelAtPeriodEnd;
  const isExpired = new Date(subscription.currentPeriodEnd) < new Date();

  const planColor =
    plan.name === "MAX"
      ? "bg-primary/10 text-primary border-primary/20"
      : "bg-primary/10 text-primary border-primary/20";

  const getStatusBadge = () => {
    if (status === "suspended") {
      return (
        <Badge
          variant="secondary"
          className="bg-destructive/10 text-destructive border-destructive/30"
        >
          <Clock className="h-3 w-3 mr-1" />
          Suspended
        </Badge>
      );
    }
    if (isExpired || status === "expired") {
      return (
        <Badge
          variant="secondary"
          className="bg-muted text-muted-foreground border-border"
        >
          <Clock className="h-3 w-3 mr-1" />
          Expired
        </Badge>
      );
    }
    if (isCancelled) {
      return (
        <Badge
          variant="secondary"
          className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
        >
          <Clock className="h-3 w-3 mr-1" />
          Ends {format(new Date(subscription.currentPeriodEnd), "MMM d")}
        </Badge>
      );
    }
    if (status === "active") {
      return (
        <Badge
          variant="secondary"
          className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
        >
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Active
        </Badge>
      );
    }
    return null;
  };

  return (
    <Card className="bg-card border-border/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Current Subscription
        </CardTitle>
        <CardDescription>Your plan and billing information</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-wrap">
              <Badge className={planColor}>{plan.displayName}</Badge>
              {getStatusBadge()}
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">
                ₦{(plan.priceNgn / 100).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">per month</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 p-4 bg-muted/30 border border-border/40 rounded-lg">
            <div>
              <label className="text-sm font-medium text-foreground">
                {isExpired || status === "expired"
                  ? "Expired On"
                  : isCancelled
                    ? "Active Until"
                    : "Next Billing Date"}
              </label>
              <div className="mt-1 text-sm text-muted-foreground">
                {format(
                  new Date(subscription.currentPeriodEnd),
                  "MMMM d, yyyy",
                )}
              </div>
              {subscription.lastPaymentDate && !isExpired && (
                <div className="mt-1 text-xs text-muted-foreground">
                  Last payment:{" "}
                  {format(
                    new Date(subscription.lastPaymentDate),
                    "MMM d, yyyy",
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">
                Payment Method
              </label>
              <div className="mt-1 text-sm text-muted-foreground">
                Card (via Paystack)
              </div>
              <button
                className="mt-1 text-xs text-primary hover:underline"
                onClick={() => {
                  /* Will be handled by manage subscription */
                }}
              >
                View details
              </button>
            </div>
          </div>

          {(isExpired || status === "suspended") && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                {status === "suspended"
                  ? "⚠️ Your subscription is suspended. Please update your payment method to reactivate."
                  : "⚠️ Your subscription has expired. Renew now to continue accessing premium features."}
              </p>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Plan Includes:
            </label>
            <div className="grid gap-2">
              {plan.features.slice(0, 6).map((feature: string, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
              {plan.features.length > 6 && (
                <div className="text-sm text-muted-foreground ml-6">
                  + {plan.features.length - 6} more features
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
