import { auth } from "@/lib/auth/server";
import { cancelSubscriptionForUser } from "@/lib/payment/cancel-subscription";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/billing/cancel — stop renewal at the end of the paid period.
 * Recurring billing is disabled on Paystack FIRST; if that fails the user
 * is told so and nothing is marked cancelled locally (otherwise they'd see
 * "cancelled" and still get charged).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await cancelSubscriptionForUser(session.user.id, {
      immediate: false,
      reason: "User-initiated cancellation",
    });

    if (!result.ok) {
      const status =
        result.code === "no_subscription"
          ? 404
          : result.code === "already_cancelled"
            ? 400
            : 502;
      return NextResponse.json({ error: result.message }, { status });
    }

    const subscription = result.subscription as {
      currentPeriodEnd?: Date;
    } | null;

    return NextResponse.json({
      message:
        "Subscription will be canceled at the end of your current billing period.",
      current_period_end: subscription?.currentPeriodEnd
        ? new Date(subscription.currentPeriodEnd).toISOString()
        : null,
    });
  } catch (error) {
    console.error("Billing cancel error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
