import { auth } from "@/lib/auth/server";
import { subscriptionRepository } from "@/lib/db/pg/repositories/subscription-repository.pg";
import { PricingCards } from "@/components/pricing/pricing-cards";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Zap } from "lucide-react";
import { PaymentRequiredBanner } from "@/components/payment-required-banner";

export const metadata = {
  title: "Pricing - MIVA University",
  description: "Choose the perfect plan for your learning journey",
};

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    plan?: string;
    success?: string;
    error?: string;
    required?: string;
  }>;
}) {
  const params = await searchParams;
  
  const session = await auth.api.getSession({
    headers: await Promise.resolve(new Headers()),
  });

  let currentSubscription: any = null;
  if (session?.user) {
    currentSubscription = await subscriptionRepository.getUserActiveSubscription(
      session.user.id
    );
  }

  const plans = (await subscriptionRepository.getAllPlans()) as any[];

  const successMessage = params.success;
  const errorMessage = params.error;

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
            Unlock your academic potential with AI-powered study tools designed for MIVA University students
          </p>
        </div>

        {successMessage && (
          <Card className="max-w-2xl mx-auto mb-8 bg-green-500/10 border-green-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <p className="text-sm font-medium text-green-600">
                  Payment successful! Your subscription is now active. Check your profile for details.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {errorMessage && (
          <Card className="max-w-2xl mx-auto mb-8 bg-red-500/10 border-red-500/20">
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-red-600">
                {errorMessage === "payment_failed"
                  ? "Payment failed. Please try again or contact support."
                  : "An error occurred. Please try again."}
              </p>
            </CardContent>
          </Card>
        )}

        {(params.required === "true" || params.error === "true") && (
          <div className="max-w-2xl mx-auto mb-8">
            <PaymentRequiredBanner showError={params.error === "true"} />
          </div>
        )}

        <PricingCards
          plans={plans}
          currentSubscription={currentSubscription}
          isLoggedIn={!!session?.user}
          selectedPlan={params.plan}
        />

        <div className="mt-16 text-center space-y-4">
          <h3 className="text-2xl font-bold">Why MIVA Students Choose Us</h3>
          <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto mt-8">
            <Card className="bg-card border-border/40">
              <CardContent className="pt-6 text-center space-y-2">
                <div className="w-12 h-12 mx-auto bg-blue-500/10 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-blue-600" />
                </div>
                <h4 className="font-semibold">Nigerian Payment</h4>
                <p className="text-sm text-muted-foreground">
                  Pay with Naira via Paystack - cards, bank transfer, USSD
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border/40">
              <CardContent className="pt-6 text-center space-y-2">
                <div className="w-12 h-12 mx-auto bg-purple-500/10 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-purple-600" />
                </div>
                <h4 className="font-semibold">Cancel Anytime</h4>
                <p className="text-sm text-muted-foreground">
                  No long-term contracts. Cancel your subscription anytime.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border/40">
              <CardContent className="pt-6 text-center space-y-2">
                <div className="w-12 h-12 mx-auto bg-green-500/10 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
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
