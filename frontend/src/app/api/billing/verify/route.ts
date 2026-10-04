import { auth } from "@/lib/auth/server";
import { applyIndividualCharge } from "@/lib/billing/individual";
import { subscriptionRepository } from "@/lib/db/pg/repositories/subscription-repository.pg";
import { paystackService } from "@/lib/payment/paystack-service";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/billing/verify { reference } — called by /billing/callback after
 * Paystack redirects back. Verifies the transaction with Paystack
 * server-side and applies it through the same code path as the webhook,
 * so activation doesn't depend on webhook delivery timing.
 *
 * Response `state`:
 *  - "active"     payment verified and applied
 *  - "pending"    Paystack hasn't settled it yet (bank transfer/USSD)
 *  - "failed"     Paystack reports failed/abandoned/reversed
 *  - "unresolved" paid, but we couldn't apply it (plan/amount problem) —
 *                 the student must contact support with the reference
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimit = await checkRateLimit(
      `billing-verify:${session.user.id}`,
      30,
      60,
    );
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

    const { reference } = (await req.json().catch(() => ({}))) as {
      reference?: string;
    };
    if (!reference || typeof reference !== "string") {
      return NextResponse.json({ error: "Missing reference" }, { status: 400 });
    }

    // Only the student who started this checkout may verify it.
    const txn =
      await subscriptionRepository.getTransactionByReference(reference);
    if (!txn || txn.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 },
      );
    }
    if (txn.status === "success") {
      return NextResponse.json({ state: "active", reference });
    }

    const verifyRes = await paystackService.verifyTransaction(reference);
    if (!verifyRes?.status || !verifyRes.data) {
      return NextResponse.json({ state: "pending", reference });
    }

    const paystackStatus = verifyRes.data.status;
    if (paystackStatus !== "success") {
      const failed = ["failed", "abandoned", "reversed"].includes(
        paystackStatus,
      );
      if (failed) {
        await subscriptionRepository.updateTransaction(reference, {
          status: "failed",
        });
      }
      return NextResponse.json({
        state: failed ? "failed" : "pending",
        reference,
      });
    }

    const result = await applyIndividualCharge(verifyRes.data);
    if (result === "applied") {
      return NextResponse.json({ state: "active", reference });
    }

    console.error(
      `[Billing] verify ${reference} for user ${session.user.id}: ${result}`,
    );
    return NextResponse.json({ state: "unresolved", reference });
  } catch (error) {
    console.error("Billing verify error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
