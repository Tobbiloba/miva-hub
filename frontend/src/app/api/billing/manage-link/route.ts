import { auth } from "@/lib/auth/server";
import { isPlaceholderSubscriptionCode } from "@/lib/billing/rules";
import { subscriptionRepository } from "@/lib/db/pg/repositories/subscription-repository.pg";
import { paystackService } from "@/lib/payment/paystack-service";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/billing/manage-link — Paystack-hosted page where the student can
 * update the card used for renewals.
 */
export async function GET(req: NextRequest) {
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
        { error: "No active subscription found" },
        { status: 404 },
      );
    }
    if (isPlaceholderSubscriptionCode(subscription.paystackSubscriptionCode)) {
      return NextResponse.json(
        {
          error:
            "Your subscription is still being set up with our payment provider. Please try again shortly.",
        },
        { status: 409 },
      );
    }

    const link = await paystackService.getSubscriptionManageLink(
      subscription.paystackSubscriptionCode!,
    );

    return NextResponse.json({ link });
  } catch (error) {
    console.error("Error generating manage link:", error);
    return NextResponse.json(
      { error: "Failed to generate manage link" },
      { status: 502 },
    );
  }
}
