import { auth } from "@/lib/auth/server";
import { getAppBaseUrl } from "@/lib/billing/app-url";
import {
  INDIVIDUAL_PLANS,
  type IndividualPlanKey,
  assertPlanRowMatches,
} from "@/lib/billing/plans";
import { pgDb } from "@/lib/db/pg/db.pg";
import { subscriptionRepository } from "@/lib/db/pg/repositories/subscription-repository.pg";
import { SubscriptionPlanSchema, UserSchema } from "@/lib/db/pg/schema.pg";
import { paystackService } from "@/lib/payment/paystack-service";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimit = await checkRateLimit(
      `billing-checkout:${session.user.id}`,
      10,
      3600,
    );
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

    const { plan } = (await req.json()) as { plan?: string };

    if (plan !== "monthly" && plan !== "yearly") {
      return NextResponse.json(
        { error: "Invalid plan. Must be 'monthly' or 'yearly'." },
        { status: 400 },
      );
    }
    const planDef = INDIVIDUAL_PLANS[plan as IndividualPlanKey];

    // Check for existing subscription that still runs (incl. one set to
    // cancel at period end — a second checkout would double-bill).
    const existing = await subscriptionRepository.getUserActiveSubscription(
      session.user.id,
    );
    if (existing) {
      return NextResponse.json(
        {
          error: existing.cancelAtPeriodEnd
            ? "Your current subscription is still active until the end of its period. You can subscribe again after it ends."
            : "You already have an active subscription.",
        },
        { status: 400 },
      );
    }

    // Look up the plan from DB
    const [dbPlan] = await pgDb
      .select()
      .from(SubscriptionPlanSchema)
      .where(eq(SubscriptionPlanSchema.name, planDef.name))
      .limit(1);

    if (!dbPlan || !dbPlan.paystackPlanCode) {
      console.error(
        `Billing checkout: ${planDef.name} missing or has no Paystack plan code — run scripts/setup-paystack-plans.ts`,
      );
      return NextResponse.json(
        { error: "This plan is temporarily unavailable." },
        { status: 503 },
      );
    }

    // The UI advertised planDef's price; refuse to charge anything else.
    const drift = assertPlanRowMatches(planDef, dbPlan);
    if (!drift.ok) {
      console.error(`Billing checkout: ${drift.reason}`);
      return NextResponse.json(
        { error: "This plan is temporarily unavailable." },
        { status: 503 },
      );
    }

    // Throws in production when the public URL isn't configured — never
    // send Paystack a localhost callback.
    const callbackUrl = `${getAppBaseUrl()}/billing/callback`;

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

    // Pending transaction: the webhook and callback verify resolve the
    // payer and plan from this row (not from Paystack metadata).
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
