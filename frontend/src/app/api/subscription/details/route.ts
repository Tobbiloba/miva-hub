import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { subscriptionRepository } from "@/lib/db/pg/repositories/subscription-repository.pg";

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [subscriptionData, transactions, allPlans] = await Promise.all([
      subscriptionRepository.getUserSubscriptionWithPlan(session.user.id),
      subscriptionRepository.getUserTransactionHistory(session.user.id, 20),
      subscriptionRepository.getAllPlans(),
    ]);

    return NextResponse.json({
      subscription: subscriptionData,
      transactions,
      availablePlans: allPlans,
    });
  } catch (error) {
    console.error("Error fetching subscription details:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscription details" },
      { status: 500 }
    );
  }
}
