"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Crown, Zap, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Plan {
  id: string;
  name: string;
  displayName: string;
  description: string;
  priceNgn: number;
  features: string[];
  limits: Record<string, number>;
  paystackPlanCode: string;
}

interface PricingCardsProps {
  plans: Plan[];
  currentSubscription: any;
  isLoggedIn: boolean;
  selectedPlan?: string;
}

export function PricingCards({
  plans,
  currentSubscription,
  isLoggedIn,
  selectedPlan,
}: PricingCardsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const router = useRouter();

  const handleSubscribe = async (plan: Plan) => {
    setLoading(plan.id);

    try {
      const response = await fetch("/api/subscription/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planName: plan.name,
          planCode: plan.paystackPlanCode,
        }),
      });

      const data = await response.json();

      if (response.status === 401) {
        toast.error("Please sign in to subscribe");
        setLoading(null);
        router.push("/sign-in?redirect=/pricing");
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to initialize payment");
      }

      if (!data.authorizationUrl) {
        throw new Error("No authorization URL returned");
      }

      window.location.href = data.authorizationUrl;
    } catch (error) {
      console.error("Subscription error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to start subscription");
      setLoading(null);
    }
  };

  const proPlan = plans.find((p) => p.name === "PRO");
  const maxPlan = plans.find((p) => p.name === "MAX");

  if (!proPlan || !maxPlan) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Unable to load plans. Please refresh the page.</p>
      </div>
    );
  }

  const isCurrentPlan = (planId: string) => {
    return currentSubscription?.planId === planId && currentSubscription?.status === "active";
  };

  return (
    <div className="grid gap-8 md:grid-cols-2 max-w-5xl mx-auto">
      <Card
        className={`bg-card border-border/40 relative ${
          selectedPlan === "PRO" ? "ring-2 ring-blue-500" : ""
        }`}
      >
        {isCurrentPlan(proPlan.id) && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">
              Current Plan
            </Badge>
          </div>
        )}
        
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-2xl">{proPlan.displayName}</CardTitle>
            </div>
            <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">
              Popular
            </Badge>
          </div>
          <CardDescription className="text-base">{proPlan.description}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold">₦{(proPlan.priceNgn / 100).toLocaleString()}</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Perfect for regular students</p>
          </div>

          <Button
            className="w-full"
            size="lg"
            onClick={() => handleSubscribe(proPlan)}
            disabled={loading !== null || isCurrentPlan(proPlan.id)}
          >
            {loading === proPlan.id ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : isCurrentPlan(proPlan.id) ? (
              "Current Plan"
            ) : (
              "Subscribe to PRO"
            )}
          </Button>

          <div className="space-y-3">
            <p className="text-sm font-semibold">Features:</p>
            {proPlan.features.map((feature, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-muted-foreground">{feature}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card
        className={`bg-card border-border/40 relative ${
          selectedPlan === "MAX" ? "ring-2 ring-purple-500" : ""
        } md:scale-105 md:shadow-xl`}
      >
        {isCurrentPlan(maxPlan.id) && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20">
              Current Plan
            </Badge>
          </div>
        )}
        
        <div className="absolute -top-3 right-4">
          <Badge className="bg-gradient-to-r from-purple-600 to-purple-400 text-white border-0">
            <Crown className="h-3 w-3 mr-1" />
            Best Value
          </Badge>
        </div>

        <CardHeader>
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-2xl">{maxPlan.displayName}</CardTitle>
          </div>
          <CardDescription className="text-base">{maxPlan.description}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold">₦{(maxPlan.priceNgn / 100).toLocaleString()}</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Unlimited access with advanced features</p>
          </div>

          <Button
            className="w-full bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600"
            size="lg"
            onClick={() => handleSubscribe(maxPlan)}
            disabled={loading !== null || isCurrentPlan(maxPlan.id)}
          >
            {loading === maxPlan.id ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : isCurrentPlan(maxPlan.id) ? (
              "Current Plan"
            ) : (
              "Subscribe to MAX"
            )}
          </Button>

          <div className="space-y-3">
            <p className="text-sm font-semibold">Everything in PRO, plus:</p>
            {maxPlan.features.slice(10).map((feature, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-muted-foreground">{feature}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
