import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { subscriptionRepository } from "@/lib/db/pg/repositories/subscription-repository.pg";
import { paystackService } from "@/lib/payment/paystack-service";

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscription = await subscriptionRepository.getUserActiveSubscription(session.user.id);
    
    if (!subscription?.paystackSubscriptionCode) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 404 }
      );
    }

    const link = await paystackService.getSubscriptionManageLink(
      subscription.paystackSubscriptionCode
    );

    return NextResponse.json({ link });
  } catch (error) {
    console.error("Error generating manage link:", error);
    return NextResponse.json(
      { error: "Failed to generate manage link" },
      { status: 500 }
    );
  }
}
