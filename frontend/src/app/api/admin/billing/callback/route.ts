import { requireAdmin } from "@/lib/auth/admin";
import { activateUniversitySubscription } from "@/lib/billing/org";
import { subscriptionRepository } from "@/lib/db/pg/repositories/subscription-repository.pg";
import { paystackService } from "@/lib/payment/paystack-service";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/admin/billing/callback — Paystack browser redirect after payment.
 * Verifies the transaction and activates the org subscription, then sends
 * the admin back to /admin/billing. The webhook is the safety net if the
 * admin closes the tab before redirecting.
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

    const verifyRes = await paystackService.verifyTransaction(reference);
    if (!verifyRes.status || verifyRes.data?.status !== "success") {
      return redirectTo("error=payment_failed");
    }

    const metadata = (verifyRes.data as any)?.metadata;
    if (
      metadata?.type !== "university_subscription" ||
      !metadata?.subscriptionId
    ) {
      return redirectTo("error=invalid_transaction");
    }

    const result = await activateUniversitySubscription({
      subscriptionId: metadata.subscriptionId,
      reference,
      amountKobo: verifyRes.data.amount,
    });
    if (result === "not_found") return redirectTo("error=invalid_transaction");

    await subscriptionRepository
      .updateTransaction(reference, {
        status: "success",
        paidAt: new Date(),
        paystackTransactionId: verifyRes.data.id?.toString(),
      })
      .catch(() => {});

    return redirectTo("success=1");
  } catch (error) {
    console.error("[Org Billing] callback Error:", error);
    return redirectTo("error=verification_failed");
  }
}
