"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard } from "lucide-react";
import { SubscriptionCard } from "./subscription-card";
import { PaymentHistoryTable } from "./payment-history-table";
import { ManageSubscription } from "./manage-subscription";
import { UsageStatsCard } from "./usage-stats-card";

interface SubscriptionData {
  subscription: {
    subscription: any;
    plan: any;
  } | null;
  transactions: any[];
  availablePlans: any[];
}

export function BillingTab() {
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/subscription/details")
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <div className="animate-pulse space-y-4">
          <CreditCard className="h-12 w-12 mx-auto opacity-50" />
          <p>Loading billing information...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="bg-card border-border/40">
        <CardContent className="pt-6">
          <div className="text-center py-12 text-muted-foreground">
            <p>Unable to load billing information</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data.subscription) {
    return <NoSubscriptionState />;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <SubscriptionCard 
          subscription={data.subscription.subscription}
          plan={data.subscription.plan}
        />
        <UsageStatsCard />
      </div>
      <ManageSubscription 
        subscription={data.subscription.subscription}
        currentPlan={data.subscription.plan}
        availablePlans={data.availablePlans}
      />
      <PaymentHistoryTable transactions={data.transactions} />
    </div>
  );
}

function NoSubscriptionState() {
  return (
    <Card className="bg-card border-border/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          No Active Subscription
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12 space-y-4">
          <CreditCard className="h-16 w-16 mx-auto text-muted-foreground opacity-50" />
          <div>
            <p className="text-lg font-medium">You don&apos;t have an active subscription</p>
            <p className="text-sm text-muted-foreground mt-2">
              Choose a plan to get started with MIVA University
            </p>
          </div>
          <Button onClick={() => window.location.href = "/pricing"}>
            View Plans
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
