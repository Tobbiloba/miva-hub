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
import { CheckCircle2, Crown, GraduationCap, Loader2, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

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
      toast.error(
        error instanceof Error ? error.message : "Failed to start subscription",
      );
      setLoading(null);
    }
  };

  const studentPlan = plans.find((p) => p.name === "STUDENT");
  const premiumPlan = plans.find((p) => p.name === "PREMIUM");
  const facultyPlan = plans.find((p) => p.name === "FACULTY");

  if (!studentPlan || !premiumPlan || !facultyPlan) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Unable to load plans. Please refresh the page.</p>
      </div>
    );
  }

  const isCurrentPlan = (planId: string) => {
    return (
      currentSubscription?.planId === planId &&
      currentSubscription?.status === "active"
    );
  };

  return (
    <div className="grid gap-8 md:grid-cols-3 max-w-7xl mx-auto">
      {/* Student Plan */}
      <Card
        className={`bg-card border-border/40 relative ${
          selectedPlan === "STUDENT" ? "ring-2 ring-primary" : ""
        }`}
      >
        {isCurrentPlan(studentPlan.id) && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <Badge className="bg-primary/10 text-primary border-primary/20">
              Current Plan
            </Badge>
          </div>
        )}

        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <CardTitle className="text-2xl">
                {studentPlan.displayName}
              </CardTitle>
            </div>
            <Badge className="bg-primary/10 text-primary border-primary/20">
              Popular
            </Badge>
          </div>
          <CardDescription className="text-base">
            {studentPlan.description}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold">
                ₦{(studentPlan.priceNgn / 100).toLocaleString()}
              </span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Perfect for regular students
            </p>
          </div>

          <Button
            className="w-full"
            size="lg"
            onClick={() => handleSubscribe(studentPlan)}
            disabled={loading !== null || isCurrentPlan(studentPlan.id)}
          >
            {loading === studentPlan.id ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : isCurrentPlan(studentPlan.id) ? (
              "Current Plan"
            ) : (
              "Subscribe to Student"
            )}
          </Button>

          <div className="space-y-3">
            <p className="text-sm font-semibold">Features:</p>
            {studentPlan.features.slice(0, 8).map((feature, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm text-muted-foreground">{feature}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Premium Plan */}
      <Card
        className={`bg-card border-border/40 relative ${
          selectedPlan === "PREMIUM" ? "ring-2 ring-primary" : ""
        } md:scale-105 md:shadow-xl`}
      >
        {isCurrentPlan(premiumPlan.id) && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <Badge className="bg-primary/10 text-primary border-primary/20">
              Current Plan
            </Badge>
          </div>
        )}

        <div className="absolute -top-3 right-4">
          <Badge className="bg-primary text-primary-foreground border-0">
            <Crown className="h-3 w-3 mr-1" />
            Best Value
          </Badge>
        </div>

        <CardHeader>
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            <CardTitle className="text-2xl">
              {premiumPlan.displayName}
            </CardTitle>
          </div>
          <CardDescription className="text-base">
            {premiumPlan.description}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold">
                ₦{(premiumPlan.priceNgn / 100).toLocaleString()}
              </span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Advanced features with unlimited access
            </p>
          </div>

          <Button
            className="w-full"
            size="lg"
            onClick={() => handleSubscribe(premiumPlan)}
            disabled={loading !== null || isCurrentPlan(premiumPlan.id)}
          >
            {loading === premiumPlan.id ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : isCurrentPlan(premiumPlan.id) ? (
              "Current Plan"
            ) : (
              "Subscribe to Premium"
            )}
          </Button>

          <div className="space-y-3">
            <p className="text-sm font-semibold">
              Everything in Student, plus:
            </p>
            {premiumPlan.features.slice(8, 16).map((feature, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm text-muted-foreground">{feature}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Faculty Plan */}
      <Card
        className={`bg-card border-border/40 relative ${
          selectedPlan === "FACULTY" ? "ring-2 ring-emerald-500" : ""
        }`}
      >
        {isCurrentPlan(facultyPlan.id) && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
              Current Plan
            </Badge>
          </div>
        )}

        <CardHeader>
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <CardTitle className="text-2xl">
              {facultyPlan.displayName}
            </CardTitle>
          </div>
          <CardDescription className="text-base">
            {facultyPlan.description}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold">
                ₦{(facultyPlan.priceNgn / 100).toLocaleString()}
              </span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              For educators and course creators
            </p>
          </div>

          <Button
            className="w-full"
            size="lg"
            onClick={() => handleSubscribe(facultyPlan)}
            disabled={loading !== null || isCurrentPlan(facultyPlan.id)}
          >
            {loading === facultyPlan.id ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : isCurrentPlan(facultyPlan.id) ? (
              "Current Plan"
            ) : (
              "Subscribe to Faculty"
            )}
          </Button>

          <div className="space-y-3">
            <p className="text-sm font-semibold">Faculty Features:</p>
            {facultyPlan.features.slice(0, 8).map((feature, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-muted-foreground">{feature}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
