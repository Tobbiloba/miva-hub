import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth/server";
import { cancelSubscriptionForUser } from "@/lib/payment/cancel-subscription";

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { immediate = false } = await req.json();

    const result = await cancelSubscriptionForUser(session.user.id, {
      immediate,
    });

    if (!result.ok) {
      const status =
        result.code === "no_subscription"
          ? 404
          : result.message.includes("payment provider")
            ? 502
            : 500;
      return NextResponse.json({ error: result.message }, { status });
    }

    return NextResponse.json({
      success: true,
      subscription: result.subscription,
      message: result.message,
    });
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
