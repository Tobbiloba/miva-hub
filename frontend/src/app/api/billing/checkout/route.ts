import { auth } from "@/lib/auth/server";
import { getAppBaseUrl } from "@/lib/billing/app-url";
import {
  INDIVIDUAL_PLANS,
  type IndividualPlanKey,
  assertPlanRowMatches,
} from "@/lib/billing/plans";
import { pgDb } from "@/lib/db/pg/db.pg";
import { subscriptionRepository } from "@/lib/db/pg/repositories/subscription-repository.pg";
import {
  PaymentTransactionSchema,
  SubscriptionPlanSchema,
  UserSchema,
} from "@/lib/db/pg/schema.pg";
import { paystackService } from "@/lib/payment/paystack-service";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

/** How long an unpaid checkout stays the user's one open checkout. */
const OPEN_CHECKOUT_WINDOW_MINUTES = 30;

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

    // One checkout at a time. Two open checkouts (two tabs, a retry) can
    // both be paid, leaving the student with two recurring Paystack
    // subscriptions — so hand back the open one instead of starting another.
    const [openCheckout] = await pgDb
      .select({
        metadata: PaymentTransactionSchema.metadata,
        reference: PaymentTransactionSchema.paystackReference,
      })
      .from(PaymentTransactionSchema)
      .where(
        and(
          eq(PaymentTransactionSchema.userId, session.user.id),
          eq(PaymentTransactionSchema.status, "pending"),
          // Compared in SQL: created_at is a timezone-less column filled
          // by the DB's clock, so a JS Date would be off by the DB's offset.
          gte(
            PaymentTransactionSchema.createdAt,
            sql`now() - make_interval(mins => ${OPEN_CHECKOUT_WINDOW_MINUTES})`,
          ),
        ),
      )
      .orderBy(desc(PaymentTransactionSchema.createdAt))
      .limit(1);
    if (openCheckout?.metadata?.authorizationUrl) {
      if (openCheckout.metadata.plan !== plan) {
        return NextResponse.json(
          {
            error:
              "You already have a checkout in progress. Complete it, or try again in 30 minutes.",
          },
          { status: 409 },
        );
      }
      return NextResponse.json({
        authorization_url: openCheckout.metadata.authorizationUrl,
        reference: openCheckout.reference,
      });
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

    // Paystack is the source of truth for recurring billing: a live
    // subscription there (e.g. past_due and retrying, or one our webhook
    // never recorded) means a new checkout would bill twice.
    if (customerCode) {
      let live: Awaited<
        ReturnType<typeof paystackService.getCustomerSubscriptions>
      >;
      try {
        live = (
          await paystackService.getCustomerSubscriptions(customerCode)
        ).filter((s) => s.status === "active" || s.status === "attention");
      } catch (error) {
        console.error(
          "Billing checkout: Paystack customer lookup failed",
          error,
        );
        return NextResponse.json(
          {
            error: "We couldn't reach our payment provider. Please try again.",
          },
          { status: 503 },
        );
      }
      if (live.length > 0) {
        return NextResponse.json(
          {
            error:
              "You already have a subscription with our payment provider. Manage or update it from your billing page.",
          },
          { status: 409 },
        );
      }
    }

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
        plan,
        // Returned to a repeat checkout within the open window (see above)
        authorizationUrl: initRes.data.authorization_url,
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
