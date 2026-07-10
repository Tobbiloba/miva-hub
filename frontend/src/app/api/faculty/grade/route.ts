import { reviewAIDecision } from "@/lib/ai/decision-ledger";
import { getFacultyInfo } from "@/lib/auth/faculty";
import { getSession } from "@/lib/auth/server";
import { pgDb } from "@/lib/db/pg/db.pg";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import { AIDecisionSchema } from "@/lib/db/pg/schema.pg";
import { and, desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const gradeSubmissionSchema = z.object({
  submissionId: z.string().uuid(),
  grade: z.number().min(0).max(1000), // Allow up to 1000 points
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
    const { submissionId, grade, feedback } = gradeSubmissionSchema.parse(body);

    // Verify faculty has access to this submission
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

    // Validate grade is within assignment limits
    const maxPoints = Number(submissionDetails.assignment.totalPoints);
    if (grade > maxPoints) {
      return NextResponse.json(
        { error: `Grade cannot exceed ${maxPoints} points` },
        { status: 400 },
      );
    }

    // Update the submission grade
    const updatedSubmission = await pgAcademicRepository.updateSubmissionGrade(
      submissionId,
      grade,
      feedback,
      facultyInfo.id,
    );

    if (!updatedSubmission) {
      return NextResponse.json(
        { error: "Failed to update grade" },
        { status: 500 },
      );
    }

    // Override trail: if this submission carried an auto-posted AI grade
    // (ledger status "executed" — never reviewed by a human), this manual
    // re-grade IS the human review. Record it so the ops dashboard's
    // override rate counts corrections to grades the AI issued on its own.
    // Ledger failures never block the grading flow itself.
    let aiReviewStatus: "approved" | "overridden" | null = null;
    try {
      const [aiDecision] = await pgDb
        .select({
          id: AIDecisionSchema.id,
          metadata: AIDecisionSchema.metadata,
        })
        .from(AIDecisionSchema)
        .where(
          and(
            eq(AIDecisionSchema.subjectType, "assignment_submission"),
            eq(AIDecisionSchema.subjectId, submissionId),
            eq(AIDecisionSchema.decisionType, "grading"),
            eq(
              AIDecisionSchema.universityId,
              submissionDetails.course.universityId,
            ),
            eq(AIDecisionSchema.status, "executed"),
          ),
        )
        .orderBy(desc(AIDecisionSchema.createdAt))
        .limit(1);

      if (aiDecision) {
        const suggestedGrade = Number(
          (aiDecision.metadata as Record<string, unknown> | null)?.[
            "suggestedGrade"
          ],
        );
        const wasChanged =
          !Number.isFinite(suggestedGrade) || suggestedGrade !== grade;
        aiReviewStatus = wasChanged ? "overridden" : "approved";
        await reviewAIDecision({
          decisionId: aiDecision.id,
          universityId: submissionDetails.course.universityId,
          reviewedById: facultyInfo.id,
          status: aiReviewStatus,
          metadata: { finalGrade: grade, via: "manual_regrade" },
        });
      }
    } catch (ledgerError) {
      console.error(
        "Failed to record override trail for submission",
        submissionId,
        ledgerError,
      );
    }

    return NextResponse.json({
      success: true,
      submission: updatedSubmission,
      aiReviewStatus,
      message: "Grade submitted successfully",
    });
  } catch (error) {
    console.error("Error submitting grade:", error);

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

export async function GET(request: NextRequest) {
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

    const url = new URL(request.url);
    const submissionId = url.searchParams.get("submissionId");

    if (!submissionId) {
      return NextResponse.json(
        { error: "submissionId parameter required" },
        { status: 400 },
      );
    }

    // Get submission details
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

    return NextResponse.json({
      success: true,
      submission: submissionDetails,
    });
  } catch (error) {
    console.error("Error fetching submission:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
