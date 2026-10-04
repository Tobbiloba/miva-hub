import { PaymentRequiredBanner } from "@/components/payment-required-banner";
import { PricingCards } from "@/components/pricing/pricing-cards";
import { Card, CardContent } from "@/components/ui/card";
import { auth } from "@/lib/auth/server";
import { getBillingStatus } from "@/lib/billing/status";
import { CheckCircle2, Zap } from "lucide-react";
import { headers } from "next/headers";

export const metadata = {
  title: "Pricing - Askly",
  description: "Choose the perfect plan for your learning journey",
};

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{
    required?: string;
    error?: string;
  }>;
}) {
  const params = await searchParams;

  const session = await auth.api
    .getSession({ headers: await headers() })
    .catch(() => null);

  let hasActiveSubscription = false;
  if (session?.user) {
    const billing = await getBillingStatus(session.user.id);
    hasActiveSubscription = billing.subscription?.status === "active";
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 md:py-20">
        <div className="text-center mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium">
            <Zap className="h-4 w-4" />
            Nigerian Student Pricing
          </div>
          <h1 className="text-4xl md:text-5xl font-bold">
            Choose Your Learning Plan
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Unlock your academic potential with AI-powered study tools designed
            for university students
          </p>
        </div>

        {(params.required === "true" || params.error === "true") && (
          <div className="max-w-2xl mx-auto mb-8">
            <PaymentRequiredBanner showError={params.error === "true"} />
          </div>
        )}

        <div id="pricing-section">
          <PricingCards
            isLoggedIn={!!session?.user}
            hasActiveSubscription={hasActiveSubscription}
          />
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          New students get a free trial. Prices in Naira, billed via Paystack.
        </p>

        <div className="mt-16 text-center space-y-4">
          <h3 className="text-2xl font-bold">Why Students Choose Us</h3>
          <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto mt-8">
            <Card className="bg-card border-border/40">
              <CardContent className="pt-6 text-center space-y-2">
                <div className="w-12 h-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-semibold">Nigerian Payment</h4>
                <p className="text-sm text-muted-foreground">
                  Pay with Naira via Paystack - cards, bank transfer, USSD
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border/40">
              <CardContent className="pt-6 text-center space-y-2">
                <div className="w-12 h-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-semibold">Cancel Anytime</h4>
                <p className="text-sm text-muted-foreground">
                  No long-term contracts. Cancel your subscription anytime.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border/40">
              <CardContent className="pt-6 text-center space-y-2">
                <div className="w-12 h-12 mx-auto bg-emerald-500/10 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h4 className="font-semibold">Instant Access</h4>
                <p className="text-sm text-muted-foreground">
                  Start using all features immediately after payment
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
