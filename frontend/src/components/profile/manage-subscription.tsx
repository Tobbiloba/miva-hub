"use client";

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
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ExternalLink, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

interface ManageSubscriptionProps {
  subscription: any;
  currentPlan: any;
  /** Re-fetch billing details after a change (e.g. cancel). */
  onChanged?: () => void;
}

export function ManageSubscription({
  subscription,
  currentPlan,
  onChanged,
}: ManageSubscriptionProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const isExpired =
    new Date(subscription.currentPeriodEnd) < new Date() ||
    subscription.status === "expired";
  const isPastDue = subscription.status === "past_due";

  const handleUpdatePayment = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/manage-link");
      const data = await res.json();

      if (res.ok && data.link) {
        window.open(data.link, "_blank", "noopener,noreferrer");
        toast.success("Opening payment management portal...");
      } else {
        throw new Error(data.error || "Failed to get manage link");
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to open payment management",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/cancel", { method: "POST" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Failed to cancel");
      }
      toast.success("Subscription will cancel at end of billing period");
      onChanged?.();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to cancel subscription",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-card border-border/40">
      <CardHeader>
        <CardTitle>Manage Subscription</CardTitle>
        <CardDescription>
          Update your payment method or cancel your subscription
        </CardDescription>
      </CardHeader>
      <CardContent>
        {(isExpired || isPastDue) && (
          <div className="mb-4 p-4 bg-primary/10 border border-primary/20 rounded-lg">
            <p className="text-sm font-medium mb-3">
              {isPastDue
                ? "Your last renewal payment failed. Update your card or subscribe again to regain access."
                : "Renew your subscription to regain access"}
            </p>
            <Button
              className="w-full sm:w-auto min-h-11"
              onClick={() => router.push("/billing")}
            >
              Renew Now
            </Button>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Button
            variant="outline"
            className="w-full min-h-11"
            onClick={handleUpdatePayment}
            disabled={loading || isExpired}
          >
            <ExternalLink className="h-4 w-4 mr-2" aria-hidden="true" />
            Update Payment Method
          </Button>

          {!subscription.cancelAtPeriodEnd && !isExpired && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full min-h-11 text-destructive hover:text-destructive hover:bg-destructive/10"
                  disabled={loading}
                >
                  <XCircle className="h-4 w-4 mr-2" aria-hidden="true" />
                  Cancel Subscription
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Your subscription will remain active until the end of your
                    billing period. You&apos;ll still have access to{" "}
                    {currentPlan.displayName} until then, and you won&apos;t be
                    charged again.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleCancel}
                    disabled={loading}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {loading ? "Cancelling..." : "Cancel Subscription"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
