import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { paystackService } from "@/lib/payment/paystack-service";
import { subscriptionRepository } from "@/lib/db/pg/repositories/subscription-repository.pg";

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { planCode, planName } = await req.json();

    if (!planCode || !planName) {
      return NextResponse.json(
        { error: "Plan code and name are required" },
        { status: 400 }
      );
    }

    const existingSubscription = await subscriptionRepository.getUserActiveSubscription(
      session.user.id
    );
    
    if (existingSubscription) {
      return NextResponse.json(
        { error: "You already have an active subscription" },
        { status: 400 }
      );
    }

    const plan = await subscriptionRepository.getPlanByName(planName);
    
    if (!plan || !plan.paystackPlanCode) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/subscription/callback`;
    
    const initResponse = await paystackService.initializeSubscription({
      email: session.user.email,
      planCode: plan.paystackPlanCode,
      amount: plan.priceNgn,
      callbackUrl,
      metadata: {
        userId: session.user.id,
        planId: plan.id,
        planName: plan.name,
        userName: session.user.name,
      },
    });

    if (!initResponse.status) {
      return NextResponse.json(
        { error: initResponse.message || "Failed to initialize subscription" },
        { status: 500 }
      );
    }

    await subscriptionRepository.createTransaction({
      userId: session.user.id,
      paystackReference: initResponse.data.reference,
      amountNgn: plan.priceNgn,
      status: "pending",
      customerEmail: session.user.email,
      customerName: session.user.name,
      description: `${plan.displayName} - Monthly Subscription`,
      metadata: {
        planId: plan.id,
        planName: plan.name,
        userId: session.user.id,
        userName: session.user.name,
      },
    });

    return NextResponse.json({
      authorizationUrl: initResponse.data.authorization_url,
      reference: initResponse.data.reference,
      accessCode: initResponse.data.access_code,
    });
  } catch (error) {
    console.error("Error initializing subscription:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
