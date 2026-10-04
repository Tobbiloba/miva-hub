import { auth } from "@/lib/auth/server";
import { subscriptionRepository } from "@/lib/db/pg/repositories/subscription-repository.pg";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/billing/details — the signed-in user's latest subscription (with
 * its plan) and recent payment history, for the profile billing tab.
 * Scoped to the session user only.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [subscriptionData, transactions] = await Promise.all([
      subscriptionRepository.getUserSubscriptionWithPlan(session.user.id),
      subscriptionRepository.getUserTransactionHistory(session.user.id, 20),
    ]);

    return NextResponse.json({
      subscription: subscriptionData ?? null,
      transactions,
    });
  } catch (error) {
    console.error("Error fetching billing details:", error);
    return NextResponse.json(
      { error: "Failed to fetch billing details" },
      { status: 500 },
    );
  }
}
