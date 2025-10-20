import { NextRequest, NextResponse } from "next/server";
import { paystackService } from "@/lib/payment/paystack-service";
import { subscriptionRepository } from "@/lib/db/pg/repositories/subscription-repository.pg";
import { pgDb as db } from "@/lib/db/pg/db.pg";
import { UserSchema } from "@/lib/db/pg/schema.pg";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const reference = searchParams.get("reference");

    if (!reference) {
      return NextResponse.redirect(
        new URL("/pricing?error=invalid_reference", req.url)
      );
    }

    const verification = await paystackService.verifyTransaction(reference);

    if (!verification.status || verification.data.status !== "success") {
      await subscriptionRepository.updateTransaction(reference, {
        status: "failed",
      });

      return NextResponse.redirect(
        new URL("/pricing?error=payment_failed", req.url)
      );
    }

    const transaction = await subscriptionRepository.getTransactionByReference(reference);

    if (!transaction) {
      return NextResponse.redirect(
        new URL("/pricing?error=transaction_not_found", req.url)
      );
    }

    const existingSubscription = await subscriptionRepository.getUserActiveSubscription(
      transaction.userId
    );

    if (existingSubscription) {
      return NextResponse.redirect(
        new URL("/pricing?error=already_subscribed", req.url)
      );
    }

    const metadata = transaction.metadata as any;
    const planId = metadata?.planId;

    if (!planId) {
      return NextResponse.redirect(
        new URL("/pricing?error=invalid_plan", req.url)
      );
    }

    const plan = await subscriptionRepository.getPlanById(planId);

    if (!plan) {
      return NextResponse.redirect(
        new URL("/pricing?error=plan_not_found", req.url)
      );
    }

    const currentDate = new Date();
    const nextMonth = new Date(currentDate);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const subscription = await subscriptionRepository.createSubscription({
      userId: transaction.userId,
      planId: plan.id,
      paystackSubscriptionCode: verification.data.subscription?.subscription_code || "",
      paystackCustomerCode: verification.data.customer.customer_code,
      paystackAuthorizationCode: verification.data.authorization.authorization_code,
      currentPeriodStart: currentDate,
      currentPeriodEnd: nextMonth,
      nextPaymentDate: verification.data.subscription?.next_payment_date 
        ? new Date(verification.data.subscription.next_payment_date)
        : nextMonth,
    });

    await subscriptionRepository.updateTransaction(reference, {
      status: "success",
      paidAt: new Date(),
      paystackTransactionId: verification.data.id.toString(),
      subscriptionId: subscription.id,
    });

    await db
      .update(UserSchema)
      .set({
        paystackCustomerCode: verification.data.customer.customer_code,
        subscriptionStatus: "active",
        currentPlan: plan.name,
      })
      .where(eq(UserSchema.id, transaction.userId));

    await subscriptionRepository.logSubscriptionChange({
      userId: transaction.userId,
      subscriptionId: subscription.id,
      changeType: "upgrade",
      toPlanId: plan.id,
      reason: "Initial subscription purchase",
    });

    return NextResponse.redirect(
      new URL(`/pricing?success=true&plan=${plan.name}`, req.url)
    );
  } catch (error) {
    console.error("Error processing callback:", error);
    return NextResponse.redirect(
      new URL("/pricing?error=processing_failed", req.url)
    );
  }
}
