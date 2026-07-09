import { randomUUID } from "crypto";
import {
  GRADING_MODEL,
  gradeSubmission,
} from "@/lib/ai/agents/submission-grader";
import { recordAIDecision } from "@/lib/ai/decision-ledger";
import { getSession } from "@/lib/auth/server";
import { getStudentInfo } from "@/lib/auth/student";
import { s3Service } from "@/lib/aws/s3-service";
import type { S3AccessOptions } from "@/lib/aws/s3-service";
import { pgDb } from "@/lib/db/pg/db.pg";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import { AssignmentSubmissionSchema } from "@/lib/db/pg/schema.pg";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 120;

const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_PHOTO_SIZE = 15 * 1024 * 1024; // 15MB
const DEFAULT_CONFIDENCE_THRESHOLD = 0.85;

/** Governance threshold: at or above it the AI grade auto-posts. */
function getConfidenceThreshold(): number {
  const raw = Number(process.env.SNAP_GRADE_CONFIDENCE_THRESHOLD);
  if (Number.isFinite(raw) && raw > 0 && raw <= 1) return raw;
  return DEFAULT_CONFIDENCE_THRESHOLD;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> },
) {
  try {
    const { assignmentId } = await params;
    const session = await getSession();
    const studentInfo = getStudentInfo(session);

    if (!studentInfo) {
      return NextResponse.json(
        { error: "Student authentication required" },
        { status: 401 },
      );
    }

    // Verify the student has access to this assignment (enrollment-scoped,
    // same check as the regular submit route)
    const upcomingAssignments =
      await pgAcademicRepository.getStudentUpcomingAssignments(
        studentInfo.id,
        100,
      );
    const assignmentData = upcomingAssignments.find(
      ({ assignment }) => assignment.id === assignmentId,
    );

    if (!assignmentData) {
      return NextResponse.json(
        { error: "Assignment not found or access denied" },
        { status: 404 },
      );
    }

    const {
      assignment,
      course,
      submission: existingSubmission,
    } = assignmentData;

    if (existingSubmission) {
      return NextResponse.json(
        { error: "Assignment already submitted" },
        { status: 400 },
      );
    }

    const dueDate = new Date(assignment.dueDate);
    const isOverdue = dueDate < new Date();

    if (isOverdue && !assignment.allowLateSubmission) {
      return NextResponse.json(
        { error: "Late submissions are not allowed for this assignment" },
        { status: 400 },
      );
    }

    const formData = await request.formData();
    const photo = formData.get("photo");

    if (!(photo instanceof File) || photo.size === 0) {
      return NextResponse.json(
        { error: "A photo of your work is required" },
        { status: 400 },
      );
    }

    if (!ALLOWED_PHOTO_TYPES.includes(photo.type)) {
      return NextResponse.json(
        { error: "Invalid photo type. Allowed: JPG, PNG, WEBP." },
        { status: 400 },
      );
    }

    if (photo.size > MAX_PHOTO_SIZE) {
      return NextResponse.json(
        { error: "Photo must be smaller than 15MB" },
        { status: 400 },
      );
    }

    // Upload to S3 (same key pattern as the regular submit route)
    const sanitizedName = photo.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const s3Key = `submissions/${assignmentId}/${studentInfo.id}/${randomUUID()}-${sanitizedName}`;

    const accessOptions: S3AccessOptions = {
      userId: studentInfo.id,
      userRole: "student",
      courseId: course.id,
    };

    const uploadResult = await s3Service.uploadFile(
      photo,
      s3Key,
      accessOptions,
    );

    if (!uploadResult.success) {
      return NextResponse.json(
        { error: "Failed to upload photo. Please try again." },
        { status: 500 },
      );
    }

    // Create the submission row
    const [newSubmission] = await pgDb
      .insert(AssignmentSubmissionSchema)
      .values({
        assignmentId,
        studentId: studentInfo.id,
        submissionText: null,
        fileUrl: uploadResult.s3Url,
        fileName: photo.name,
        fileSize: photo.size,
        mimeType: photo.type,
        isLateSubmission: isOverdue,
        submittedAt: new Date(),
      })
      .returning();

    if (!newSubmission) {
      return NextResponse.json(
        { error: "Failed to record submission" },
        { status: 500 },
      );
    }

    const threshold = getConfidenceThreshold();
    const totalPoints = Number(assignment.totalPoints);

    // Run the shared AI grader. The photo is already submitted — a grading
    // failure must not lose the submission, so degrade to manual grading.
    let gradeResult: Awaited<ReturnType<typeof gradeSubmission>>;
    try {
      gradeResult = await gradeSubmission({
        submission: newSubmission,
        assignment,
      });
    } catch (error) {
      console.error("Snap-to-Solve grading failed:", error);
      gradeResult = { ok: false, reason: "file_unavailable" };
    }

    if (!gradeResult.ok) {
      return NextResponse.json({
        success: true,
        autoPosted: false,
        decisionId: null,
        suggestion: null,
        threshold,
        message:
          "Your photo was submitted, but AI grading was unavailable. Your professor will grade it.",
      });
    }

    const { suggestion } = gradeResult;
    const { suggestedGrade, confidence } = suggestion;
    const autoPosted = confidence >= threshold;

    if (autoPosted) {
      // High confidence — post the grade immediately (no faculty user;
      // attribution lives in the ledger metadata as autoPosted).
      const updated = await pgAcademicRepository.updateSubmissionGrade(
        newSubmission.id,
        suggestedGrade,
        suggestion.feedback,
      );
      if (!updated) {
        console.error(
          "Snap-to-Solve: failed to auto-post grade for submission",
          newSubmission.id,
        );
      }
    }

    // Ledger row — universityId comes from the course row, never the request.
    const decisionId = await recordAIDecision({
      universityId: course.universityId,
      decisionType: "grading",
      actor: "snap-grading-agent",
      subjectType: "assignment_submission",
      subjectId: newSubmission.id,
      userId: studentInfo.id,
      model: GRADING_MODEL,
      inputSummary: `Snap-to-Solve photo for assignment "${assignment.title}" (${assignment.assignmentType}, ${totalPoints} pts) — file ${photo.name} (${photo.type})`,
      decision: `suggested grade: ${suggestedGrade}/${totalPoints}${autoPosted ? " (auto-posted)" : ""}`,
      reasoning: suggestion.feedback,
      confidence,
      status: autoPosted ? "executed" : "pending_review",
      metadata: {
        suggestedGrade,
        totalPoints,
        criterionBreakdown: suggestion.criterionBreakdown,
        fileIncluded: true,
        autoPosted,
        threshold,
      },
    });

    return NextResponse.json({
      success: true,
      autoPosted,
      decisionId,
      suggestion,
      threshold,
      message: autoPosted
        ? "Your work was graded automatically."
        : "Your work was submitted and sent to your professor for review.",
    });
  } catch (error) {
    console.error("Error in Snap-to-Solve submission:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
