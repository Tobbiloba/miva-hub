import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { reviewAIDecision } from "@/lib/ai/decision-ledger";
import { requireAdmin } from "@/lib/auth/admin";
import { pgDb } from "lib/db/pg/db.pg";
import { AIDecisionSchema } from "lib/db/pg/schema.pg";
import globalLogger from "logger";

const logger = globalLogger.withDefaults({ message: "AI Ops Review API: " });

const bodySchema = z.object({
  action: z.enum(["approve", "reject"]),
  note: z.string().max(1000).optional(),
});

/**
 * POST /api/admin/ai-operations/[id]/review — human close-out for escalated
 * SUPPORT decisions. Grading and admissions escalations have their own domain
 * review flows (which provision accounts / write grades); approving them here
 * would mark the ledger resolved without doing that work, so they're refused.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const adminAccess = await requireAdmin();
    if (adminAccess instanceof NextResponse) return adminAccess;

    const { id } = await params;
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // Tenant scope from the session user — never from the request
    const { getUserUniversity } = await import("@/lib/tenant");
    const university = await getUserUniversity(adminAccess.user.id);
    if (!university) {
      return NextResponse.json({ error: "No university" }, { status: 403 });
    }

    const [decision] = await pgDb
      .select({
        id: AIDecisionSchema.id,
        decisionType: AIDecisionSchema.decisionType,
        status: AIDecisionSchema.status,
      })
      .from(AIDecisionSchema)
      .where(
        and(
          eq(AIDecisionSchema.id, id),
          eq(AIDecisionSchema.universityId, university.id),
        ),
      )
      .limit(1);

    if (!decision) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (decision.status !== "pending_review") {
      return NextResponse.json(
        { error: `Already resolved (status: ${decision.status})` },
        { status: 409 },
      );
    }
    if (decision.decisionType !== "support") {
      return NextResponse.json(
        {
          error:
            "This decision must be resolved in its own queue (grading or admissions review), not here.",
        },
        { status: 409 },
      );
    }

    const status = parsed.data.action === "approve" ? "approved" : "rejected";
    const ok = await reviewAIDecision({
      decisionId: decision.id,
      universityId: university.id,
      reviewedById: adminAccess.user.id,
      status,
      metadata: {
        humanResolution: parsed.data.action,
        ...(parsed.data.note ? { resolutionNote: parsed.data.note } : {}),
      },
    });
    if (!ok) {
      return NextResponse.json({ error: "Review failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true, status });
  } catch (error) {
    logger.error("review failed", error);
    return NextResponse.json({ error: "Review failed" }, { status: 500 });
  }
}
