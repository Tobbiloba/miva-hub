import { auth } from "@/lib/auth/server";
import { pgDb as db } from "@/lib/db/pg/db.pg";
import { subscriptionRepository } from "@/lib/db/pg/repositories/subscription-repository.pg";
import { UserSchema } from "@/lib/db/pg/schema.pg";
import { paystackService } from "@/lib/payment/paystack-service";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

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
      session.user.id,
    );

    if (!subscription) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 404 },
      );
    }

    // Only real Paystack subscriptions (SUB_...) can/need to be disabled
    // remotely. Pseudo-codes like "charge_<ref>" have no recurring billing.
    const subCode = subscription.paystackSubscriptionCode;
    const isRealPaystackSubscription = !!subCode && subCode.startsWith("SUB_");

    if (isRealPaystackSubscription) {
      let emailToken = subscription.paystackEmailToken;

      // Fallback: token was never captured (older subscriptions) — fetch it
      // from Paystack so cancellation actually stops recurring billing.
      if (!emailToken) {
        const fetched = await paystackService.getSubscription(subCode);
        emailToken = fetched?.data?.email_token ?? null;

        if (emailToken) {
          await subscriptionRepository.updateSubscription(subscription.id, {
            paystackEmailToken: emailToken,
          });
        }
      }

      if (!emailToken) {
        console.error(
          `Cancel failed: no email token available for subscription ${subscription.id} (${subCode})`,
        );
        return NextResponse.json(
          {
            error:
              "Unable to cancel with our payment provider right now. Please try again or contact support.",
          },
          { status: 502 },
        );
      }

      const paystackResponse = await paystackService.disableSubscription(
        subCode,
        emailToken,
      );

      if (!paystackResponse.status) {
        return NextResponse.json(
          { error: "Failed to cancel subscription with Paystack" },
          { status: 500 },
        );
      }
    }

    const cancelledSubscription =
      await subscriptionRepository.cancelSubscription(
        subscription.id,
        !immediate,
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
      { status: 500 },
    );
  }
}
