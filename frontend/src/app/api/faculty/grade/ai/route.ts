import { NextRequest, NextResponse } from "next/server";
import { generateObject, type ModelMessage, type UserContent } from "ai";
import { z } from "zod";
import { getSession } from "@/lib/auth/server";
import { getFacultyInfo } from "@/lib/auth/faculty";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import { customModelProvider } from "@/lib/ai/models";
import { recordAIDecision } from "@/lib/ai/decision-ledger";
import { s3Service } from "@/lib/aws/s3-service";

export const maxDuration = 120;

const aiGradeRequestSchema = z.object({
  submissionId: z.string().uuid(),
});

const gradingSuggestionSchema = z.object({
  suggestedGrade: z
    .number()
    .describe("The suggested grade in points, between 0 and the total points"),
  feedback: z
    .string()
    .describe("Overall feedback for the student, specific and constructive"),
  criterionBreakdown: z
    .array(
      z.object({
        criterion: z.string().describe("The rubric criterion being assessed"),
        comment: z.string().describe("Specific comment for this criterion"),
        pointsAwarded: z
          .number()
          .describe("Points awarded for this criterion"),
      }),
    )
    .describe("Per-criterion assessment derived from the instructions/rubric"),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe(
      "Confidence in this grading from 0 to 1. Lower it when the submission is ambiguous, illegible, or off-topic.",
    ),
});

const GRADEABLE_FILE_TYPES = /^(image\/(jpeg|png|webp|gif)|application\/pdf)$/;

/** Resolve a stored submission fileUrl (s3://bucket/key or https) to a fetchable URL. */
async function resolveFileUrl(fileUrl: string): Promise<URL | null> {
  try {
    if (fileUrl.startsWith("s3://")) {
      const withoutScheme = fileUrl.slice("s3://".length);
      const slashIndex = withoutScheme.indexOf("/");
      if (slashIndex === -1) return null;
      const bucket = withoutScheme.slice(0, slashIndex);
      const key = withoutScheme.slice(slashIndex + 1);
      const signed = await s3Service.getSignedUrl(bucket, key, 600);
      return new URL(signed);
    }
    if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
      return new URL(fileUrl);
    }
    return null;
  } catch (error) {
    console.error("Error resolving submission file URL:", error);
    return null;
  }
}

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

    const hasText = !!submission.submissionText?.trim();
    const isGradeableFile =
      !!submission.fileUrl &&
      !!submission.mimeType &&
      GRADEABLE_FILE_TYPES.test(submission.mimeType);

    if (!hasText && !isGradeableFile) {
      return NextResponse.json(
        {
          error:
            "This submission has no text and no AI-gradeable file (image or PDF). Please grade it manually.",
        },
        { status: 400 },
      );
    }

    const totalPoints = Number(assignment.totalPoints);

    // Build the multimodal user message
    const userContent: UserContent = [
      {
        type: "text",
        text: [
          `Assignment: ${assignment.title}`,
          `Type: ${assignment.assignmentType}`,
          `Total points: ${totalPoints}`,
          "",
          "Instructions / rubric:",
          assignment.instructions ||
            assignment.description ||
            "(No written rubric provided — grade against the assignment title and standard academic expectations for this assignment type.)",
          "",
          hasText
            ? `Student's text submission:\n${submission.submissionText}`
            : "The student did not provide a text submission.",
          isGradeableFile
            ? `\nThe student's submitted file (${submission.fileName ?? "attachment"}) is attached. It may contain handwritten work — read it carefully.`
            : "",
        ].join("\n"),
      },
    ];

    let fileIncluded = false;
    if (isGradeableFile && submission.fileUrl && submission.mimeType) {
      const resolvedUrl = await resolveFileUrl(submission.fileUrl);
      if (resolvedUrl) {
        userContent.push({
          type: "file",
          data: resolvedUrl,
          mediaType: submission.mimeType,
        });
        fileIncluded = true;
      }
    }

    if (!hasText && !fileIncluded) {
      return NextResponse.json(
        { error: "Could not access the submitted file for AI grading" },
        { status: 502 },
      );
    }

    const messages: ModelMessage[] = [{ role: "user", content: userContent }];

    // gemini-2.5-flash: multimodal (reads handwritten PDFs/images) and available
    // on all API tiers — 2.5-pro has no free-tier quota and hard-fails there.
    const GRADING_MODEL = "gemini-2.5-flash";
    const model = await customModelProvider.getModel({
      provider: "google",
      model: GRADING_MODEL,
    });

    const { object: suggestion } = await generateObject({
      model,
      schema: gradingSuggestionSchema,
      system: [
        "You are a strict, fair university examiner.",
        "Grade the student's submission ONLY against the provided assignment instructions/rubric — never invent criteria beyond them, and never reward content unrelated to the task.",
        `The maximum grade is ${totalPoints} points. suggestedGrade and the sum of criterion pointsAwarded must never exceed ${totalPoints}.`,
        "Be specific: reference concrete parts of the submission in every comment. Avoid generic praise.",
        "If the submission is illegible, incomplete, or off-topic, grade it accordingly and lower your confidence.",
      ].join("\n"),
      messages,
    });

    // Defensive clamp — the model must not exceed the assignment cap
    const suggestedGrade = Math.min(
      Math.max(suggestion.suggestedGrade, 0),
      totalPoints,
    );
    const confidence = Math.min(Math.max(suggestion.confidence, 0), 1);

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
        fileIncluded ? `file ${submission.fileName ?? ""} (${submission.mimeType})` : null,
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
      suggestion: {
        suggestedGrade,
        feedback: suggestion.feedback,
        criterionBreakdown: suggestion.criterionBreakdown,
        confidence,
      },
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
