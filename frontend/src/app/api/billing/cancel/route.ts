import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { paystackService } from "@/lib/payment/paystack-service";
import { subscriptionRepository } from "@/lib/db/pg/repositories/subscription-repository.pg";

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscription = await subscriptionRepository.getUserActiveSubscription(
      session.user.id,
    );

    if (!subscription) {
      return NextResponse.json(
        { error: "No active subscription to cancel." },
        { status: 404 },
      );
    }

    if (subscription.cancelAtPeriodEnd) {
      return NextResponse.json(
        { error: "Subscription is already set to cancel at period end." },
        { status: 400 },
      );
    }

    // Disable on Paystack side
    if (subscription.paystackSubscriptionCode && subscription.paystackEmailToken) {
      try {
        await paystackService.disableSubscription(
          subscription.paystackSubscriptionCode,
          subscription.paystackEmailToken,
        );
      } catch (psErr) {
        console.error("Paystack disable error (continuing):", psErr);
      }
    }

    // Mark cancel_at_period_end locally
    await subscriptionRepository.cancelSubscription(subscription.id, true);

    await subscriptionRepository.logSubscriptionChange({
      userId: session.user.id,
      subscriptionId: subscription.id,
      changeType: "cancel",
      fromPlanId: subscription.planId,
      reason: "User-initiated cancellation",
    });

    return NextResponse.json({
      message: "Subscription will be canceled at the end of your current billing period.",
      current_period_end: subscription.currentPeriodEnd.toISOString(),
    });
  } catch (error) {
    console.error("Billing cancel error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
