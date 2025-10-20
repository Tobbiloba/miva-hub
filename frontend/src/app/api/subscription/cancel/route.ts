import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { paystackService } from "@/lib/payment/paystack-service";
import { subscriptionRepository } from "@/lib/db/pg/repositories/subscription-repository.pg";
import { pgDb as db } from "@/lib/db/pg/db.pg";
import { UserSchema } from "@/lib/db/pg/schema.pg";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { immediate = false } = await req.json();

    const subscription = await subscriptionRepository.getUserActiveSubscription(
      session.user.id
    );

    if (!subscription) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 404 }
      );
    }

    if (subscription.paystackSubscriptionCode && subscription.paystackEmailToken) {
      const paystackResponse = await paystackService.disableSubscription(
        subscription.paystackSubscriptionCode,
        subscription.paystackEmailToken
      );

      if (!paystackResponse.status) {
        return NextResponse.json(
          { error: "Failed to cancel subscription with Paystack" },
          { status: 500 }
        );
      }
    }

    const cancelledSubscription = await subscriptionRepository.cancelSubscription(
      subscription.id,
      !immediate
    );

    if (immediate) {
      await db
        .update(UserSchema)
        .set({
          subscriptionStatus: "cancelled",
          currentPlan: "FREE",
        })
        .where(eq(UserSchema.id, session.user.id));
    }

    await subscriptionRepository.logSubscriptionChange({
      userId: session.user.id,
      subscriptionId: subscription.id,
      changeType: "cancel",
      fromPlanId: subscription.planId,
      reason: immediate ? "Immediate cancellation" : "Cancel at period end",
    });

    return NextResponse.json({
      success: true,
      subscription: cancelledSubscription,
      message: immediate
        ? "Subscription cancelled immediately"
        : "Subscription will be cancelled at the end of the current period",
    });
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
