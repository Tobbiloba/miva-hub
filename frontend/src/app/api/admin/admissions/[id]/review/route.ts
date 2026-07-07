import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/admin";
import { provisionStudentAccount } from "lib/ai/admissions-officer";
import { reviewAIDecision } from "lib/ai/decision-ledger";
import { pgDb } from "lib/db/pg/db.pg";
import { AdmissionApplicationSchema } from "lib/db/pg/schema.pg";
import globalLogger from "logger";

const logger = globalLogger.withDefaults({
  message: "Admissions Review API: ",
});

const reviewSchema = z.object({
  action: z.enum(["admit", "waitlist", "reject"]),
});

/** POST /api/admin/admissions/[id]/review — a human resolves an escalated
 * application. Admitting provisions the student account. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const adminAccess = await requireAdmin();
    if (adminAccess instanceof NextResponse) return adminAccess;

    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json(
        { error: "Invalid application id" },
        { status: 400 },
      );
    }
    const parsed = reviewSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
    const { action } = parsed.data;

    const { getUserUniversity } = await import("@/lib/tenant");
    const university = await getUserUniversity(adminAccess.user.id);
    if (!university) {
      return NextResponse.json(
        { error: "No university associated with this admin" },
        { status: 403 },
      );
    }

    // Tenant-scoped load: id alone grants nothing
    const [application] = await pgDb
      .select()
      .from(AdmissionApplicationSchema)
      .where(
        and(
          eq(AdmissionApplicationSchema.id, id),
          eq(AdmissionApplicationSchema.universityId, university.id),
        ),
      )
      .limit(1);
    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 },
      );
    }
    if (application.status !== "escalated") {
      return NextResponse.json(
        {
          error: `Only escalated applications can be reviewed (this one is ${application.status.replace("_", " ")}).`,
        },
        { status: 409 },
      );
    }

    let provisioned: Awaited<
      ReturnType<typeof provisionStudentAccount>
    > | null = null;
    if (action === "admit") {
      provisioned = await provisionStudentAccount({
        fullName: application.fullName,
        email: application.email,
        universityId: university.id,
        programId: application.programId,
      });
    }

    const status =
      action === "admit"
        ? ("admitted" as const)
        : action === "waitlist"
          ? ("waitlisted" as const)
          : ("rejected" as const);

    await pgDb
      .update(AdmissionApplicationSchema)
      .set({
        status,
        provisionedUserId: provisioned?.userId ?? null,
        reviewedById: adminAccess.user.id,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(AdmissionApplicationSchema.id, id),
          eq(AdmissionApplicationSchema.universityId, university.id),
        ),
      );

    // Close out the ledger row: approved when the human matched the agent's
    // suggestion, overridden otherwise
    if (application.decisionLedgerId) {
      await reviewAIDecision({
        decisionId: application.decisionLedgerId,
        universityId: university.id,
        reviewedById: adminAccess.user.id,
        status: application.aiDecision === action ? "approved" : "overridden",
        metadata: {
          humanAction: action,
          provisionedUserId: provisioned?.userId ?? null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      status,
      // One-time display for the admin to convey to the student
      credentials: provisioned
        ? {
            email: application.email,
            studentId: provisioned.studentId,
            tempPassword: provisioned.tempPassword,
          }
        : null,
    });
  } catch (error) {
    logger.error("review failed", error);
    if (error instanceof Error && error.message.includes("already exists")) {
      return NextResponse.json(
        { error: "An account with this applicant's email already exists." },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "Review failed" }, { status: 500 });
  }
}
