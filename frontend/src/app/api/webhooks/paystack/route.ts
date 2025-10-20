import { NextRequest, NextResponse } from "next/server";
import { paystackService } from "@/lib/payment/paystack-service";
import { subscriptionRepository } from "@/lib/db/pg/repositories/subscription-repository.pg";
import { pgDb as db } from "@/lib/db/pg/db.pg";
import { UserSchema, UserSubscriptionSchema } from "@/lib/db/pg/schema.pg";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-paystack-signature");

    if (!signature) {
      console.error("Webhook: No signature provided");
      return NextResponse.json({ error: "No signature" }, { status: 400 });
    }

    const isValid = paystackService.verifyWebhookSignature(body, signature);

    if (!isValid) {
      console.error("Webhook: Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(body);
    
    const webhookEvent = await subscriptionRepository.logWebhookEvent({
      eventType: event.event,
      paystackEventId: event.data?.id?.toString(),
      payload: event,
      signature,
    });

    try {
      await processWebhookEvent(event);
      
      await subscriptionRepository.markWebhookProcessed(webhookEvent.id, true);
      
      return NextResponse.json({ status: "success" });
    } catch (error) {
      console.error("Webhook processing error:", error);
      
      await subscriptionRepository.markWebhookProcessed(
        webhookEvent.id,
        false,
        error instanceof Error ? error.message : "Unknown error"
      );
      
      return NextResponse.json({ status: "error", message: "Processing failed" }, { status: 500 });
    }
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

async function processWebhookEvent(event: any) {
  const eventType = event.event;
  const data = event.data;

  console.log(`Processing webhook event: ${eventType}`);

  switch (eventType) {
    case "subscription.create":
      await handleSubscriptionCreate(data);
      break;

    case "subscription.disable":
      await handleSubscriptionDisable(data);
      break;

    case "subscription.not_renew":
      await handleSubscriptionNotRenew(data);
      break;

    case "charge.success":
      await handleChargeSuccess(data);
      break;

    case "invoice.payment_failed":
      await handlePaymentFailed(data);
      break;

    case "invoice.update":
      await handleInvoiceUpdate(data);
      break;

    default:
      console.log(`Unhandled event type: ${eventType}`);
  }
}

async function handleSubscriptionCreate(data: any) {
  console.log("Subscription created:", data.subscription_code);
}

async function handleSubscriptionDisable(data: any) {
  console.log("Subscription disabled:", data.subscription_code);
  
  const [subscription] = await db
    .select()
    .from(UserSubscriptionSchema)
    .where(eq(UserSubscriptionSchema.paystackSubscriptionCode, data.subscription_code))
    .limit(1);

  if (subscription) {
    await subscriptionRepository.updateSubscription(subscription.id, {
      status: "cancelled",
      cancelledAt: new Date(),
    });

    await db
      .update(UserSchema)
      .set({
        subscriptionStatus: "cancelled",
        currentPlan: "FREE",
      })
      .where(eq(UserSchema.id, subscription.userId));

    await subscriptionRepository.logSubscriptionChange({
      userId: subscription.userId,
      subscriptionId: subscription.id,
      changeType: "cancel",
      fromPlanId: subscription.planId,
      reason: "Subscription disabled via webhook",
    });
  }
}

async function handleSubscriptionNotRenew(data: any) {
  console.log("Subscription will not renew:", data.subscription_code);
  
  const [subscription] = await db
    .select()
    .from(UserSubscriptionSchema)
    .where(eq(UserSubscriptionSchema.paystackSubscriptionCode, data.subscription_code))
    .limit(1);

  if (subscription) {
    await subscriptionRepository.updateSubscription(subscription.id, {
      cancelAtPeriodEnd: true,
    });
  }
}

async function handleChargeSuccess(data: any) {
  console.log("Charge successful:", data.reference);
  
  if (data.plan) {
    const [subscription] = await db
      .select()
      .from(UserSubscriptionSchema)
      .where(
        eq(
          UserSubscriptionSchema.paystackSubscriptionCode,
          data.subscription.subscription_code
        )
      )
      .limit(1);

    if (subscription) {
      const currentPeriodEnd = new Date(subscription.currentPeriodEnd);
      const nextMonth = new Date(currentPeriodEnd);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      await subscriptionRepository.updateSubscription(subscription.id, {
        lastPaymentDate: new Date(),
        currentPeriodStart: currentPeriodEnd,
        currentPeriodEnd: nextMonth,
        nextPaymentDate: nextMonth,
        amountPaidNgn: data.amount,
        status: "active",
      });

      await subscriptionRepository.createTransaction({
        userId: subscription.userId,
        subscriptionId: subscription.id,
        paystackReference: data.reference,
        paystackTransactionId: data.id.toString(),
        amountNgn: data.amount,
        status: "success",
        customerEmail: data.customer.email,
        description: "Monthly subscription renewal",
        paidAt: new Date(),
      });

      console.log(`Subscription renewed for user ${subscription.userId}`);
    }
  }
}

async function handlePaymentFailed(data: any) {
  console.error("Payment failed:", data);
  
  if (data.subscription) {
    const [subscription] = await db
      .select()
      .from(UserSubscriptionSchema)
      .where(
        eq(
          UserSubscriptionSchema.paystackSubscriptionCode,
          data.subscription.subscription_code
        )
      )
      .limit(1);

    if (subscription) {
      await subscriptionRepository.createTransaction({
        userId: subscription.userId,
        subscriptionId: subscription.id,
        paystackReference: data.reference || `failed_${Date.now()}`,
        amountNgn: data.amount || 0,
        status: "failed",
        customerEmail: data.customer.email,
        description: "Failed subscription renewal",
      });

      console.log(`Payment failed for user ${subscription.userId}`);
    }
  }
}

async function handleInvoiceUpdate(data: any) {
  console.log("Invoice updated:", data);
}
