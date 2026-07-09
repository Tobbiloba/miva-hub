import {
  GRADING_MODEL,
  gradeSubmission,
} from "@/lib/ai/agents/submission-grader";
import { recordAIDecision } from "@/lib/ai/decision-ledger";
import { getFacultyInfo } from "@/lib/auth/faculty";
import { getSession } from "@/lib/auth/server";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const maxDuration = 120;

const aiGradeRequestSchema = z.object({
  submissionId: z.string().uuid(),
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
    const { submissionId } = aiGradeRequestSchema.parse(body);

    // Tenant + ownership check: submission must belong to a course this
    // faculty teaches (join through course_instructor, same as manual grading)
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

    const { submission, assignment, course, student } = submissionDetails;

    const result = await gradeSubmission({ submission, assignment });

    if (!result.ok) {
      if (result.reason === "not_gradeable") {
        return NextResponse.json(
          {
            error:
              "This submission has no text and no AI-gradeable file (image or PDF). Please grade it manually.",
          },
          { status: 400 },
        );
      }
      return NextResponse.json(
        { error: "Could not access the submitted file for AI grading" },
        { status: 502 },
      );
    }

    const { suggestion, totalPoints, hasText, fileIncluded } = result;
    const { suggestedGrade, confidence } = suggestion;

    // Record in the AI decision ledger as a pending suggestion.
    // universityId is derived from the course row (DB), never from the request.
    const decisionId = await recordAIDecision({
      universityId: course.universityId,
      decisionType: "grading",
      actor: "grading-agent",
      subjectType: "assignment_submission",
      subjectId: submission.id,
      userId: student.id,
      model: GRADING_MODEL,
      inputSummary: [
        `Assignment "${assignment.title}" (${assignment.assignmentType}, ${totalPoints} pts)`,
        hasText ? "text submission" : null,
        fileIncluded
          ? `file ${submission.fileName ?? ""} (${submission.mimeType})`
          : null,
      ]
        .filter(Boolean)
        .join(" — "),
      decision: `suggested grade: ${suggestedGrade}/${totalPoints}`,
      reasoning: suggestion.feedback,
      confidence,
      status: "pending_review",
      metadata: {
        suggestedGrade,
        totalPoints,
        criterionBreakdown: suggestion.criterionBreakdown,
        fileIncluded,
      },
    });

    if (!decisionId) {
      return NextResponse.json(
        { error: "Failed to record AI grading decision" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      decisionId,
      suggestion,
    });
  } catch (error) {
    console.error("Error generating AI grade suggestion:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "AI grading failed. Please try again or grade manually." },
      { status: 500 },
    );
  }
}
