import { requireAdmin } from "@/lib/auth/admin";
import { ORG_PRICE_PER_SEAT_NGN, type OrgInterval } from "@/lib/billing/org";
import { pgDb } from "@/lib/db/pg/db.pg";
import { subscriptionRepository } from "@/lib/db/pg/repositories/subscription-repository.pg";
import { UniversitySubscriptionSchema } from "@/lib/db/pg/schema.pg";
import { paystackService } from "@/lib/payment/paystack-service";
import { checkRateLimit } from "@/lib/rate-limit";
import { getUserUniversity } from "@/lib/tenant";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:4001";

const checkoutSchema = z.object({
  seats: z.number().int().min(1).max(100000),
  interval: z.enum(["monthly", "yearly"]),
});

/**
 * POST /api/admin/billing/checkout — start a prepaid per-seat org payment.
 * Creates a pending university_subscription row and a Paystack one-time
 * charge for seats × price; activation happens on verify/webhook.
 */
export async function POST(request: NextRequest) {
  try {
    const adminAccess = await requireAdmin();
    if (adminAccess instanceof NextResponse) return adminAccess;

    if (
      !checkRateLimit(`org-checkout:${adminAccess.user.id}`, 10, 3600).allowed
    ) {
      return NextResponse.json(
        { success: false, error: "Too many checkout attempts" },
        { status: 429 },
      );
    }

    const university = await getUserUniversity(adminAccess.user.id);
    if (!university) {
      return NextResponse.json(
        { success: false, error: "No university associated with your account" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { seats, interval } = checkoutSchema.parse(body);

    const pricePerSeat = ORG_PRICE_PER_SEAT_NGN[interval as OrgInterval];
    const amountKobo = seats * pricePerSeat;

    // Pending row — activated by callback verify or webhook
    const [pending] = await pgDb
      .insert(UniversitySubscriptionSchema)
      .values({
        universityId: university.id,
        seatLimit: seats,
        pricePerSeatNgn: pricePerSeat,
        interval,
        status: "pending",
      })
      .returning();

    const initRes = await paystackService.initializeTransaction({
      email: adminAccess.user.email,
      amount: amountKobo,
      callbackUrl: `${BASE_URL}/api/admin/billing/callback`,
      metadata: {
        type: "university_subscription",
        universityId: university.id,
        subscriptionId: pending.id,
        seats,
        interval,
      },
    });

    if (!initRes.status) {
      console.error("[Org Billing] Paystack init failed:", initRes.message);
      return NextResponse.json(
        {
          success: false,
          error: initRes.message || "Failed to start checkout",
        },
        { status: 502 },
      );
    }

    // Audit trail in payment_transaction (admin is the payer)
    await subscriptionRepository
      .createTransaction({
        userId: adminAccess.user.id,
        paystackReference: initRes.data.reference,
        amountNgn: amountKobo,
        status: "pending",
        customerEmail: adminAccess.user.email,
        customerName: adminAccess.user.name,
        description: `University subscription: ${seats} seats (${interval}) — ${university.name}`,
        metadata: {
          type: "university_subscription",
          universityId: university.id,
          subscriptionId: pending.id,
        },
      })
      .catch((e) => console.error("[Org Billing] transaction log failed:", e));

    return NextResponse.json({
      success: true,
      data: {
        authorization_url: initRes.data.authorization_url,
        reference: initRes.data.reference,
      },
    });
  } catch (error) {
    console.error("[Org Billing] checkout Error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: error.issues[0]?.message || "Validation failed",
        },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to start checkout" },
      { status: 500 },
    );
  }
}
