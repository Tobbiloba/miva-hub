import { requireSuperAdmin } from "@/lib/auth/admin";
import { ORG_PRICE_PER_SEAT_NGN } from "@/lib/billing/org";
import { pgDb } from "@/lib/db/pg/db.pg";
import {
  UniversitySchema,
  UniversitySubscriptionSchema,
} from "@/lib/db/pg/schema.pg";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const grantSchema = z.object({
  seatLimit: z.number().int().min(1).max(100000),
  months: z.number().int().min(1).max(36).default(12),
  notes: z.string().max(500).optional(),
});

/**
 * POST /api/super-admin/universities/[id]/subscription — comp/grant an org
 * subscription without payment (sales-led deals, pilots, MIVA itself).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const access = await requireSuperAdmin();
    if (access instanceof NextResponse) return access;

    const { id } = await params;
    const body = await request.json();
    const data = grantSchema.parse(body);

    const [university] = await pgDb
      .select({ id: UniversitySchema.id, name: UniversitySchema.name })
      .from(UniversitySchema)
      .where(eq(UniversitySchema.id, id))
      .limit(1);
    if (!university) {
      return NextResponse.json(
        { success: false, error: "University not found" },
        { status: 404 },
      );
    }

    const now = new Date();
    const end = new Date(now);
    end.setMonth(end.getMonth() + data.months);

    const [granted] = await pgDb
      .insert(UniversitySubscriptionSchema)
      .values({
        universityId: university.id,
        seatLimit: data.seatLimit,
        pricePerSeatNgn: ORG_PRICE_PER_SEAT_NGN.monthly,
        interval: "monthly",
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd: end,
        amountPaidNgn: 0,
        grantedBy: access.user.id,
        notes: data.notes,
      })
      .returning();

    console.log(
      `[Org Billing] ${access.user.id} granted ${data.seatLimit} seats × ${data.months}mo to ${university.name}`,
    );

    return NextResponse.json({
      success: true,
      data: granted,
      message: `Granted ${data.seatLimit} seats to ${university.name} until ${end.toLocaleDateString()}`,
    });
  } catch (error) {
    console.error("[Org Billing] grant Error:", error);
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
      { success: false, error: "Failed to grant subscription" },
      { status: 500 },
    );
  }
}
