import { getAIDecisionStats, listAIDecisions } from "@/lib/ai/decision-ledger";
import { requireAdmin } from "@/lib/auth/admin";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const PAGE_SIZE = 50;

const querySchema = z.object({
  sinceDays: z.coerce.number().int().min(1).max(365).default(30),
  decisionType: z
    .enum([
      "grading",
      "support",
      "admissions",
      "tutoring",
      "content",
      "operations",
    ])
    .optional(),
  status: z
    .enum(["executed", "pending_review", "approved", "overridden", "rejected"])
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
});

export async function GET(request: NextRequest) {
  try {
    // Check admin access
    const adminAccess = await requireAdmin();
    if (adminAccess instanceof NextResponse) {
      return adminAccess;
    }

    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({
      sinceDays: searchParams.get("sinceDays") ?? undefined,
      decisionType: searchParams.get("decisionType") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      page: searchParams.get("page") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid query parameters" },
        { status: 400 },
      );
    }
    const query = parsed.data;

    // Tenant scope: universityId derived from the session user, never the request
    const { getUserUniversity } = await import("@/lib/tenant");
    const university = await getUserUniversity(adminAccess.user.id);

    if (!university) {
      // Super admins without a university have no tenant-scoped ledger view
      return NextResponse.json({
        success: true,
        stats: {
          sinceDays: query.sinceDays,
          total: 0,
          overridden: 0,
          overrideRate: 0,
          byType: [],
        },
        decisions: [],
        page: query.page,
        pageSize: PAGE_SIZE,
        hasMore: false,
      });
    }

    const [stats, rows] = await Promise.all([
      getAIDecisionStats(university.id, query.sinceDays),
      listAIDecisions({
        universityId: university.id,
        decisionType: query.decisionType,
        status: query.status,
        sinceDays: query.sinceDays,
        // Fetch one extra row to detect whether another page exists
        limit: PAGE_SIZE + 1,
        offset: (query.page - 1) * PAGE_SIZE,
      }),
    ]);

    const hasMore = rows.length > PAGE_SIZE;
    const decisions = hasMore ? rows.slice(0, PAGE_SIZE) : rows;

    return NextResponse.json({
      success: true,
      stats,
      decisions,
      page: query.page,
      pageSize: PAGE_SIZE,
      hasMore,
    });
  } catch (error) {
    console.error("[AI Operations API] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch AI operations data" },
      { status: 500 },
    );
  }
}
