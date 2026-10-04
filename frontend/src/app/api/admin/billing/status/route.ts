import { requireAdmin } from "@/lib/auth/admin";
import {
  ORG_PRICE_PER_SEAT_NGN,
  countStudentSeatsUsed,
  getActiveUniversitySubscription,
  getUniversitySeatCoverage,
} from "@/lib/billing/org";
import { pgDb } from "@/lib/db/pg/db.pg";
import { UniversitySubscriptionSchema } from "@/lib/db/pg/schema.pg";
import { getUserUniversity } from "@/lib/tenant";
import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

/** GET /api/admin/billing/status — org subscription + seat usage for the admin's university. */
export async function GET() {
  try {
    const adminAccess = await requireAdmin();
    if (adminAccess instanceof NextResponse) return adminAccess;

    const university = await getUserUniversity(adminAccess.user.id);
    if (!university) {
      return NextResponse.json(
        { success: false, error: "No university associated with your account" },
        { status: 403 },
      );
    }

    const [activeSub, coverage, seatsUsed, [latestSub]] = await Promise.all([
      getActiveUniversitySubscription(university.id),
      getUniversitySeatCoverage(university.id),
      countStudentSeatsUsed(university.id),
      pgDb
        .select()
        .from(UniversitySubscriptionSchema)
        .where(eq(UniversitySubscriptionSchema.universityId, university.id))
        .orderBy(desc(UniversitySubscriptionSchema.createdAt))
        .limit(1),
    ]);

    const sub = activeSub ?? latestSub ?? null;

    return NextResponse.json({
      success: true,
      data: {
        universityName: university.name,
        subscription: sub
          ? {
              id: sub.id,
              status: activeSub ? "active" : sub.status,
              // While covered: total seats across all covering blocks —
              // the same number the student paywall enforces.
              seatLimit:
                activeSub && coverage ? coverage.seatLimit : sub.seatLimit,
              interval: sub.interval,
              pricePerSeatNgn: sub.pricePerSeatNgn,
              currentPeriodStart: sub.currentPeriodStart,
              currentPeriodEnd: sub.currentPeriodEnd,
              isComped: !!sub.grantedBy,
            }
          : null,
        covered: !!activeSub,
        seatsUsed,
        // Students beyond the limit (by signup order) are NOT covered and
        // fall back to their own trial/subscription.
        overSeatLimit: !!coverage && seatsUsed > coverage.seatLimit,
        pricing: ORG_PRICE_PER_SEAT_NGN,
      },
    });
  } catch (error) {
    console.error("[Org Billing] status Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load billing status" },
      { status: 500 },
    );
  }
}
