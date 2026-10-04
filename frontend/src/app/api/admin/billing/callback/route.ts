import { requireAdmin } from "@/lib/auth/admin";
import { activateUniversitySubscription } from "@/lib/billing/org";
import { pgDb } from "@/lib/db/pg/db.pg";
import { subscriptionRepository } from "@/lib/db/pg/repositories/subscription-repository.pg";
import { PaymentTransactionSchema } from "@/lib/db/pg/schema.pg";
import { paystackService } from "@/lib/payment/paystack-service";
import { getUserUniversity } from "@/lib/tenant";
import { and, eq, ne } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/admin/billing/callback — Paystack browser redirect after payment.
 * Verifies the transaction and activates the org subscription, then sends
 * the admin back to /admin/billing. The webhook is the safety net if the
 * admin closes the tab before redirecting.
 *
 * This is a browser navigation target (Paystack redirects here), so it
 * answers with redirects rather than JSON.
 */
export async function GET(request: NextRequest) {
  const redirectTo = (params: string) =>
    NextResponse.redirect(new URL(`/admin/billing?${params}`, request.url));

  try {
    const adminAccess = await requireAdmin();
    if (adminAccess instanceof NextResponse) {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    const reference = request.nextUrl.searchParams.get("reference");
    if (!reference) return redirectTo("error=missing_reference");

    const university = await getUserUniversity(adminAccess.user.id);
    if (!university) return redirectTo("error=invalid_transaction");

    const verifyRes = await paystackService.verifyTransaction(reference);
    if (!verifyRes.status || verifyRes.data?.status !== "success") {
      return redirectTo("error=payment_failed");
    }

    // The subscription is resolved from OUR stored reference and must
    // belong to this admin's university; Paystack metadata is not trusted.
    const result = await activateUniversitySubscription({
      reference,
      amountKobo: verifyRes.data.amount,
      currency: verifyRes.data.currency,
      expectedUniversityId: university.id,
    });
    if (result === "not_found" || result === "wrong_university") {
      return redirectTo("error=invalid_transaction");
    }
    if (result === "amount_mismatch") {
      await subscriptionRepository.updateTransaction(reference, {
        status: "amount_mismatch",
        paystackTransactionId: verifyRes.data.id?.toString(),
      });
      return redirectTo("error=amount_mismatch");
    }

    await pgDb
      .update(PaymentTransactionSchema)
      .set({
        status: "success",
        paidAt: new Date(),
        paystackTransactionId: verifyRes.data.id?.toString(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(PaymentTransactionSchema.paystackReference, reference),
          ne(PaymentTransactionSchema.status, "success"),
        ),
      );

    return redirectTo("success=1");
  } catch (error) {
    console.error("[Org Billing] callback Error:", error);
    return redirectTo("error=verification_failed");
  }
}
