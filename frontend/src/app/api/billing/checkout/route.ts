import { auth } from "@/lib/auth/server";
import { pgDb } from "@/lib/db/pg/db.pg";
import { subscriptionRepository } from "@/lib/db/pg/repositories/subscription-repository.pg";
import { SubscriptionPlanSchema, UserSchema } from "@/lib/db/pg/schema.pg";
import { paystackService } from "@/lib/payment/paystack-service";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { plan } = await req.json();

    if (plan !== "monthly" && plan !== "yearly") {
      return NextResponse.json(
        { error: "Invalid plan. Must be 'monthly' or 'yearly'." },
        { status: 400 },
      );
    }

    // Check for existing active subscription
    const existing = await subscriptionRepository.getUserActiveSubscription(
      session.user.id,
    );
    if (existing) {
      return NextResponse.json(
        { error: "You already have an active subscription." },
        { status: 400 },
      );
    }

    // Look up the plan from DB
    const planName = plan === "monthly" ? "ASKLY_MONTHLY" : "ASKLY_YEARLY";
    const [dbPlan] = await pgDb
      .select()
      .from(SubscriptionPlanSchema)
      .where(eq(SubscriptionPlanSchema.name, planName))
      .limit(1);

    if (!dbPlan || !dbPlan.paystackPlanCode) {
      return NextResponse.json(
        {
          error: "Plan not configured. Run setup-paystack-plans.ts first.",
        },
        { status: 500 },
      );
    }

    // Create or fetch Paystack customer
    const [user] = await pgDb
      .select({
        email: UserSchema.email,
        name: UserSchema.name,
        paystackCustomerCode: UserSchema.paystackCustomerCode,
      })
      .from(UserSchema)
      .where(eq(UserSchema.id, session.user.id))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let customerCode = user.paystackCustomerCode;

    if (!customerCode) {
      const names = (user.name || "Student").split(" ");
      const customerRes = await paystackService.createCustomer({
        email: user.email,
        first_name: names[0],
        last_name: names.slice(1).join(" ") || undefined,
      });

      if (customerRes.status && customerRes.data?.customer_code) {
        customerCode = customerRes.data.customer_code;
        await pgDb
          .update(UserSchema)
          .set({ paystackCustomerCode: customerCode })
          .where(eq(UserSchema.id, session.user.id));
      }
    }

    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:4001"}/billing/callback`;

    // Initialize transaction with plan
    const initRes = await paystackService.initializeSubscription({
      email: user.email,
      planCode: dbPlan.paystackPlanCode,
      amount: dbPlan.priceNgn,
      callbackUrl,
      metadata: {
        student_id: session.user.id,
        plan: plan,
        plan_id: dbPlan.id,
        plan_name: dbPlan.name,
      },
    });

    if (!initRes.status) {
      console.error("Paystack init failed:", initRes.message);
      return NextResponse.json(
        { error: initRes.message || "Failed to initialize checkout" },
        { status: 502 },
      );
    }

    // Log pending transaction
    await subscriptionRepository.createTransaction({
      userId: session.user.id,
      paystackReference: initRes.data.reference,
      amountNgn: dbPlan.priceNgn,
      status: "pending",
      customerEmail: user.email,
      customerName: user.name,
      description: `${dbPlan.displayName} Subscription`,
      metadata: {
        planId: dbPlan.id,
        planName: dbPlan.name,
        studentId: session.user.id,
      },
    });

    return NextResponse.json({
      authorization_url: initRes.data.authorization_url,
      reference: initRes.data.reference,
    });
  } catch (error) {
    console.error("Billing checkout error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
