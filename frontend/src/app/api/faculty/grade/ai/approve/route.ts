import { reviewAIDecision } from "@/lib/ai/decision-ledger";
import { getFacultyInfo } from "@/lib/auth/faculty";
import { getSession } from "@/lib/auth/server";
import { pgDb } from "@/lib/db/pg/db.pg";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import { AIDecisionSchema } from "@/lib/db/pg/schema.pg";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const approveAiGradeSchema = z.object({
  submissionId: z.string().uuid(),
  decisionId: z.string().uuid(),
  grade: z.number().min(0).max(1000),
  feedback: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    const facultyInfo = getFacultyInfo(session);

    if (!facultyInfo) {
      return NextResponse.json(
        { error: "Faculty authentication required" },
        { status: 401 },
      );
    }

    const facultyRecord = await pgAcademicRepository.getFacultyByUserId(
      facultyInfo.id,
    );

    if (!facultyRecord) {
      return NextResponse.json(
        { error: "Faculty record not found" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const { submissionId, decisionId, grade, feedback } =
      approveAiGradeSchema.parse(body);

    // Tenant + ownership check: submission must belong to a course this
    // faculty teaches (same join as the manual grading route)
    const submissionDetails = await pgAcademicRepository.getSubmissionDetails(
      submissionId,
      facultyRecord.id,
    );

    if (!submissionDetails) {
      return NextResponse.json(
        { error: "Submission not found or access denied" },
        { status: 404 },
      );
    }

    const { assignment, course } = submissionDetails;

    const maxPoints = Number(assignment.totalPoints);
    if (grade > maxPoints) {
      return NextResponse.json(
        { error: `Grade cannot exceed ${maxPoints} points` },
        { status: 400 },
      );
    }

    // Load the ledger decision — scoped to this university AND this submission
    const [decisionRow] = await pgDb
      .select({
        id: AIDecisionSchema.id,
        status: AIDecisionSchema.status,
        metadata: AIDecisionSchema.metadata,
      })
      .from(AIDecisionSchema)
      .where(
        and(
          eq(AIDecisionSchema.id, decisionId),
          eq(AIDecisionSchema.universityId, course.universityId),
          eq(AIDecisionSchema.subjectId, submissionId),
          eq(AIDecisionSchema.decisionType, "grading"),
        ),
      );

    if (!decisionRow) {
      return NextResponse.json(
        { error: "AI grading decision not found or access denied" },
        { status: 404 },
      );
    }

    if (decisionRow.status !== "pending_review") {
      return NextResponse.json(
        { error: "This AI grading suggestion has already been reviewed" },
        { status: 409 },
      );
    }

    // Apply the (possibly adjusted) grade as the official grade
    const updatedSubmission = await pgAcademicRepository.updateSubmissionGrade(
      submissionId,
      grade,
      feedback,
      facultyInfo.id,
    );

    if (!updatedSubmission) {
      return NextResponse.json(
        { error: "Failed to apply grade" },
        { status: 500 },
      );
    }

    const suggestedGrade = Number(
      (decisionRow.metadata as Record<string, unknown> | null)?.[
        "suggestedGrade"
      ],
    );
    const wasAdjusted =
      Number.isFinite(suggestedGrade) && suggestedGrade !== grade;

    await reviewAIDecision({
      decisionId,
      universityId: course.universityId,
      reviewedById: facultyInfo.id,
      status: wasAdjusted ? "overridden" : "approved",
      metadata: { finalGrade: grade },
    });

    return NextResponse.json({
      success: true,
      submission: updatedSubmission,
      reviewStatus: wasAdjusted ? "overridden" : "approved",
      message: wasAdjusted
        ? "Adjusted grade applied and AI suggestion marked as overridden"
        : "AI-suggested grade approved and applied",
    });
  } catch (error) {
    console.error("Error approving AI grade:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
