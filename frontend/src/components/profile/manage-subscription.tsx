"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, TrendingUp, TrendingDown, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
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

interface ManageSubscriptionProps {
  subscription: any;
  currentPlan: any;
  availablePlans: any[];
}

export function ManageSubscription({ subscription, currentPlan, availablePlans }: ManageSubscriptionProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  
  const otherPlan = availablePlans.find(p => p.id !== currentPlan.id);
  const isUpgrade = otherPlan && otherPlan.priceNgn > currentPlan.priceNgn;
  const isExpired = new Date(subscription.currentPeriodEnd) < new Date() || subscription.status === "expired";
  const isSuspended = subscription.status === "suspended";

  const handleUpdatePayment = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/subscription/manage-link");
      const data = await res.json();
      
      if (res.ok && data.link) {
        window.open(data.link, "_blank");
        toast.success("Opening payment management portal...");
      } else {
        throw new Error(data.error || "Failed to get manage link");
      }
    } catch (error) {
      console.error("Error getting manage link:", error);
      toast.error("Failed to open payment management");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/subscription/cancel", { 
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      
      if (res.ok) {
        toast.success("Subscription will cancel at end of billing period");
        setTimeout(() => router.refresh(), 1000);
      } else {
        const data = await res.json();
        throw new Error(data.error || "Failed to cancel");
      }
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      toast.error("Failed to cancel subscription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-card border-border/40">
      <CardHeader>
        <CardTitle>Manage Subscription</CardTitle>
        <CardDescription>Update payment method, change plan, or cancel subscription</CardDescription>
      </CardHeader>
      <CardContent>
        {(isExpired || isSuspended) && (
          <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-sm font-medium mb-3">
              {isSuspended ? "Reactivate your subscription to continue" : "Renew your subscription to regain access"}
            </p>
            <Button 
              className="w-full sm:w-auto"
              onClick={() => router.push("/pricing")}
            >
              {isSuspended ? "Reactivate Now" : "Renew Now"}
            </Button>
          </div>
        )}
        
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={handleUpdatePayment}
            disabled={loading || isExpired}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Update Payment Method
          </Button>

          {otherPlan && !isExpired && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push(`/pricing?from=profile&plan=${otherPlan.name}`)}
            >
              {isUpgrade ? (
                <>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Upgrade to {otherPlan.displayName}
                </>
              ) : (
                <>
                  <TrendingDown className="h-4 w-4 mr-2" />
                  Switch to {otherPlan.displayName}
                </>
              )}
            </Button>
          )}

          {!subscription.cancelAtPeriodEnd && !isExpired && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full text-red-600 hover:text-red-700 hover:bg-red-500/10">
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel Subscription
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Your subscription will remain active until the end of your billing period.
                    You&apos;ll still have access to {currentPlan.displayName} features until then.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleCancel} 
                    disabled={loading}
                    className="bg-red-600 hover:bg-red-700"
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
