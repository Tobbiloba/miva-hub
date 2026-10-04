import {
  applyIndividualCharge,
  applyInvoicePaid,
  applyPaymentFailed,
  applySubscriptionCreate,
  applySubscriptionStopped,
} from "@/lib/billing/individual";
import {
  activateUniversitySubscription,
  isOrgPaymentReference,
} from "@/lib/billing/org";
import {
  computeWebhookEventKey,
  decideWebhookDelivery,
  verifyPaystackSignature,
} from "@/lib/billing/rules";
import { subscriptionRepository } from "@/lib/db/pg/repositories/subscription-repository.pg";
import { pgDb } from "@/lib/db/pg/db.pg";
import { PaymentTransactionSchema } from "@/lib/db/pg/schema.pg";
import { and, eq, ne } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/webhooks/paystack
 *
 * Contract with Paystack: 200 = "done, don't resend"; anything else =
 * "retry later". So we return 200 for processed, duplicate and deliberately
 * ignored events, and 500 only when processing genuinely failed (DB down,
 * bug) so Paystack redelivers and we try again.
 *
 * Idempotency: each delivery is keyed by sha256(raw body). A redelivery of
 * an already-processed event is a 200 no-op; a redelivery of one that
 * failed is processed again. Handlers are themselves idempotent, so a rare
 * concurrent duplicate converges on the same state.
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-paystack-signature");

  if (!signature) {
    console.error("Webhook: No signature provided");
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }
  if (
    !verifyPaystackSignature(body, signature, process.env.PAYSTACK_SECRET_KEY)
  ) {
    console.error("Webhook: Invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: { event?: string; data?: any };
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const eventType = event.event ?? "unknown";

  let webhookEventId: string;
  try {
    const { event: row } = await subscriptionRepository.recordWebhookDelivery({
      eventKey: computeWebhookEventKey(body),
      eventType,
      paystackEventId: event.data?.id?.toString(),
      payload: event as Record<string, any>,
      signature,
    });
    if (decideWebhookDelivery(row) === "skip_already_processed") {
      return NextResponse.json({ status: "duplicate" });
    }
    webhookEventId = row.id;
  } catch (error) {
    console.error("Webhook: failed to record delivery:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }

  try {
    const outcome = await processWebhookEvent(eventType, event.data ?? {});
    console.log(`Webhook ${eventType}: ${outcome}`);
    await subscriptionRepository.markWebhookProcessed(webhookEventId, true);
    return NextResponse.json({ status: "success" });
  } catch (error) {
    console.error(`Webhook ${eventType} processing error:`, error);
    await subscriptionRepository
      .markWebhookProcessed(
        webhookEventId,
        false,
        error instanceof Error ? error.message : "Unknown error",
      )
      .catch((e) => console.error("Webhook: failed to record error:", e));
    return NextResponse.json(
      { status: "error", message: "Processing failed" },
      { status: 500 },
    );
  }
}

/** Returns a short outcome label for logs; throws only on real failure. */
async function processWebhookEvent(
  eventType: string,
  data: any,
): Promise<string> {
  switch (eventType) {
    case "charge.success":
      return handleChargeSuccess(data);
    case "subscription.create":
      return applySubscriptionCreate(data);
    case "subscription.not_renew":
    case "subscription.disable":
      return applySubscriptionStopped(data, eventType);
    case "invoice.update":
      return applyInvoicePaid(data);
    case "invoice.payment_failed":
      return applyPaymentFailed(data);
    default:
      return "ignored_event_type";
  }
}

async function handleChargeSuccess(data: any): Promise<string> {
  if (!data?.reference) return "ignored_no_reference";

  // Org (university) seat payments: identified by OUR records for the
  // reference, never by Paystack metadata (client-settable at checkout).
  if (await isOrgPaymentReference(data.reference)) {
    const result = await activateUniversitySubscription({
      reference: data.reference,
      amountKobo: data.amount,
      currency: data.currency,
    });
    if (result === "activated" || result === "already_active") {
      await pgDb
        .update(PaymentTransactionSchema)
        .set({
          status: "success",
          paidAt: data.paid_at ? new Date(data.paid_at) : new Date(),
          paystackTransactionId: data.id?.toString(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(PaymentTransactionSchema.paystackReference, data.reference),
            ne(PaymentTransactionSchema.status, "success"),
          ),
        );
    } else if (result === "amount_mismatch") {
      await subscriptionRepository.updateTransaction(data.reference, {
        status: "amount_mismatch",
        paystackTransactionId: data.id?.toString(),
      });
    }
    return `org:${result}`;
  }

  return applyIndividualCharge(data);
}
