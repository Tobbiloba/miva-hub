import { NextRequest, NextResponse } from "next/server";
import { paystackService } from "@/lib/payment/paystack-service";
import { subscriptionRepository } from "@/lib/db/pg/repositories/subscription-repository.pg";
import { pgDb as db } from "@/lib/db/pg/db.pg";
import { UserSchema, UserSubscriptionSchema } from "@/lib/db/pg/schema.pg";
import { eq } from "drizzle-orm";
import { sendEmail } from "@/lib/email/smtp-service";

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

  const customerEmail = data.customer?.email;
  if (!customerEmail) return;

  // Find user by email
  const [user] = await db
    .select({ id: UserSchema.id })
    .from(UserSchema)
    .where(eq(UserSchema.email, customerEmail))
    .limit(1);

  if (!user) {
    console.error("Webhook subscription.create: no user for email", customerEmail);
    return;
  }

  // Look up plan by paystack_plan_code
  const { SubscriptionPlanSchema } = await import("@/lib/db/pg/schema.pg");
  const planCode = data.plan?.plan_code;
  let planId: string | undefined;

  if (planCode) {
    const [plan] = await db
      .select({ id: SubscriptionPlanSchema.id })
      .from(SubscriptionPlanSchema)
      .where(eq(SubscriptionPlanSchema.paystackPlanCode, planCode))
      .limit(1);
    planId = plan?.id;
  }

  if (!planId) {
    console.error("Webhook subscription.create: unknown plan code", planCode);
    return;
  }

  // Check if subscription already exists (idempotency)
  const [existing] = await db
    .select({ id: UserSubscriptionSchema.id })
    .from(UserSubscriptionSchema)
    .where(eq(UserSubscriptionSchema.paystackSubscriptionCode, data.subscription_code))
    .limit(1);

  if (existing) return;

  const now = new Date();
  const nextPayment = data.next_payment_date ? new Date(data.next_payment_date) : null;
  const periodEnd = nextPayment ?? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  await subscriptionRepository.createSubscription({
    userId: user.id,
    planId,
    paystackSubscriptionCode: data.subscription_code,
    paystackCustomerCode: data.customer?.customer_code ?? "",
    paystackAuthorizationCode: data.authorization?.authorization_code ?? "",
    currentPeriodStart: now,
    currentPeriodEnd: periodEnd,
    nextPaymentDate: periodEnd,
  });

  await db
    .update(UserSchema)
    .set({
      subscriptionStatus: "active",
      currentPlan: planCode,
      paystackCustomerCode: data.customer?.customer_code,
    })
    .where(eq(UserSchema.id, user.id));

  console.log(`Subscription created for user ${user.id}, plan ${planCode}`);
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

async function sendPaymentReceiptEmail(
  userEmail: string,
  userName: string,
  planName: string,
  amount: number,
  transactionId: string,
  billingPeriod: string
) {
  try {
    const fs = await import("fs");
    const path = await import("path");
    const receiptTemplate = fs.readFileSync(
      path.join(process.cwd(), "src/lib/email/templates/payment-receipt.html"),
      "utf-8"
    );

    const amountNgn = `₦${amount.toLocaleString()}`;
    const features =
      planName === "MAX"
        ? [
            "Unlimited AI messages daily",
            "Access to GPT-4 and Claude",
            "Priority support",
          ]
        : [
            "30 AI messages per day",
            "Access to GPT-3.5",
            "Full feature access",
          ];

    const receiptHtml = receiptTemplate
      .replace("{{userName}}", userName)
      .replace("{{planName}}", planName)
      .replace(/{{amount}}/g, amountNgn)
      .replace("{{billingPeriod}}", billingPeriod)
      .replace("{{transactionId}}", transactionId)
      .replace(
        "{{paymentDate}}",
        new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      )
      .replace("{{feature1}}", features[0])
      .replace("{{feature2}}", features[1])
      .replace("{{feature3}}", features[2])
      .replace(/{{appUrl}}/g, process.env.NEXT_PUBLIC_APP_URL || "https://miva-hub.com");

    await sendEmail({
      to: userEmail,
      subject: `Payment Confirmation: ${planName} Plan - ${transactionId}`,
      html: receiptHtml,
    });

    console.log(`Payment receipt sent to ${userEmail}`);
  } catch (error) {
    console.error("Error sending payment receipt:", error);
    // Don't fail webhook if email fails
  }
}

async function handleChargeSuccess(data: any) {
  console.log("Charge successful:", data.reference);

  if (data.plan || data.plan_object) {
    const subCode = data.subscription?.subscription_code;

    // Try to find existing subscription by subscription_code
    let subscription: any = null;
    if (subCode) {
      const [found] = await db
        .select()
        .from(UserSubscriptionSchema)
        .where(eq(UserSubscriptionSchema.paystackSubscriptionCode, subCode))
        .limit(1);
      subscription = found;
    }

    // If no existing subscription, this is the initial charge — create one
    if (!subscription && data.customer?.email) {
      const [user] = await db
        .select({ id: UserSchema.id })
        .from(UserSchema)
        .where(eq(UserSchema.email, data.customer.email))
        .limit(1);

      if (user) {
        const { SubscriptionPlanSchema } = await import("@/lib/db/pg/schema.pg");
        const planCode = data.plan_object?.plan_code || data.plan;
        let planId: string | undefined;

        if (planCode) {
          const [plan] = await db
            .select({ id: SubscriptionPlanSchema.id })
            .from(SubscriptionPlanSchema)
            .where(eq(SubscriptionPlanSchema.paystackPlanCode, planCode))
            .limit(1);
          planId = plan?.id;
        }

        // Also try from transaction metadata
        if (!planId) {
          const txn = await subscriptionRepository.getTransactionByReference(data.reference);
          if (txn?.metadata) {
            planId = (txn.metadata as any)?.planId;
          }
        }

        if (planId) {
          const now = new Date();
          const interval = data.plan_object?.interval;
          const periodEnd = interval === "annually"
            ? new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
            : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

          subscription = await subscriptionRepository.createSubscription({
            userId: user.id,
            planId,
            paystackSubscriptionCode: subCode || `charge_${data.reference}`,
            paystackCustomerCode: data.customer.customer_code || "",
            paystackAuthorizationCode: data.authorization?.authorization_code || "",
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            nextPaymentDate: periodEnd,
          });

          await db
            .update(UserSchema)
            .set({
              subscriptionStatus: "active",
              currentPlan: planCode || "ASKLY_MONTHLY",
              paystackCustomerCode: data.customer.customer_code,
            })
            .where(eq(UserSchema.id, user.id));

          console.log(`Subscription created from charge.success for user ${user.id}`);
        }
      }
    }

    if (subscription) {
      // Get user info for email
      const [user] = await db
        .select()
        .from(UserSchema)
        .where(eq(UserSchema.id, subscription.userId))
        .limit(1);

      // Update transaction to success
      await subscriptionRepository.updateTransaction(data.reference, {
        status: "success",
        paidAt: new Date(),
        paystackTransactionId: data.id?.toString(),
        subscriptionId: subscription.id,
      });

      // Send payment receipt email
      if (user) {
        await sendPaymentReceiptEmail(
          user.email,
          user.name || "User",
          subscription.planName || "PRO",
          data.amount / 100, // Convert from kobo to naira
          data.reference,
          "Monthly"
        );
      }

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
      await subscriptionRepository.updateSubscription(subscription.id, {
        status: "past_due",
      });

      await subscriptionRepository.createTransaction({
        userId: subscription.userId,
        subscriptionId: subscription.id,
        paystackReference: data.reference || `failed_${Date.now()}`,
        amountNgn: data.amount || 0,
        status: "failed",
        customerEmail: data.customer?.email,
        description: "Failed subscription renewal",
      });

      console.log(`Payment failed for user ${subscription.userId}, status → past_due`);
    }
  }
}

async function handleInvoiceUpdate(data: any) {
  console.log("Invoice updated:", data);
}
