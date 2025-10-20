import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { subscriptionRepository } from "@/lib/db/pg/repositories/subscription-repository.pg";
import { getUserUsageInfo } from "@/lib/middleware/usage-check";

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscription = await subscriptionRepository.getUserActiveSubscription(
      session.user.id
    );

    const plan = await subscriptionRepository.getUserPlan(session.user.id);
    const usageInfo = await getUserUsageInfo(session.user.id);

    const planDetails = subscription
      ? await subscriptionRepository.getPlanById(subscription.planId)
      : null;

    const changeLogs = await subscriptionRepository.getUserChangeLogs(
      session.user.id,
      5
    );

    return NextResponse.json({
      subscription: subscription ? {
        id: subscription.id,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        nextPaymentDate: subscription.nextPaymentDate,
        lastPaymentDate: subscription.lastPaymentDate,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        cancelledAt: subscription.cancelledAt,
      } : null,
      plan: planDetails ? {
        name: planDetails.name,
        displayName: planDetails.displayName,
        priceNgn: planDetails.priceNgn,
        features: planDetails.features,
        limits: planDetails.limits,
      } : { name: "FREE", displayName: "Free Plan" },
      currentPlan: plan,
      usage: usageInfo?.usage,
      changeLogs,
    });
  } catch (error) {
    console.error("Error fetching subscription status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
