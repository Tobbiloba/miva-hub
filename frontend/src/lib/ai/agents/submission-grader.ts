import "server-only";

import { customModelProvider } from "@/lib/ai/models";
import { s3Service } from "@/lib/aws/s3-service";
import { type ModelMessage, type UserContent, generateObject } from "ai";
import { z } from "zod";

/**
 * Shared AI submission-grading engine.
 *
 * Pure grade-and-return: this module NEVER writes to the database or the
 * AI decision ledger — callers (faculty AI-suggest route, student
 * Snap-to-Solve route) own persistence and governance.
 */

export const gradingSuggestionSchema = z.object({
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
        pointsAwarded: z.number().describe("Points awarded for this criterion"),
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

export type GradingSuggestion = z.infer<typeof gradingSuggestionSchema>;

export const GRADEABLE_FILE_TYPES =
  /^(image\/(jpeg|png|webp|gif)|application\/pdf)$/;

// gemini-2.5-flash: multimodal (reads handwritten PDFs/images) and available
// on all API tiers — 2.5-pro has no free-tier quota and hard-fails there.
export const GRADING_MODEL = "gemini-2.5-flash";

/** Resolve a stored submission fileUrl (s3://bucket/key or https) to a fetchable URL. */
export async function resolveSubmissionFileUrl(
  fileUrl: string,
  expiresInSeconds = 600,
): Promise<URL | null> {
  try {
    if (fileUrl.startsWith("s3://")) {
      const withoutScheme = fileUrl.slice("s3://".length);
      const slashIndex = withoutScheme.indexOf("/");
      if (slashIndex === -1) return null;
      const bucket = withoutScheme.slice(0, slashIndex);
      const key = withoutScheme.slice(slashIndex + 1);
      const signed = await s3Service.getSignedUrl(
        bucket,
        key,
        expiresInSeconds,
      );
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

export interface GradeSubmissionInput {
  submission: {
    submissionText?: string | null;
    fileUrl?: string | null;
    fileName?: string | null;
    mimeType?: string | null;
  };
  assignment: {
    title: string;
    assignmentType?: string | null;
    totalPoints: string | number;
    instructions?: string | null;
    description?: string | null;
  };
}

export type GradeSubmissionResult =
  | {
      ok: true;
      suggestion: GradingSuggestion;
      totalPoints: number;
      hasText: boolean;
      fileIncluded: boolean;
    }
  | {
      ok: false;
      /**
       * not_gradeable — no text and no AI-gradeable file (image/PDF).
       * file_unavailable — the submitted file could not be accessed.
       */
      reason: "not_gradeable" | "file_unavailable";
    };

/**
 * Grade a submission against the assignment rubric with Gemini (multimodal).
 * Returns the clamped suggestion; writes nothing. Model/network errors throw —
 * callers decide how a grading failure affects their flow.
 */
export async function gradeSubmission(
  input: GradeSubmissionInput,
): Promise<GradeSubmissionResult> {
  const { submission, assignment } = input;

  const hasText = !!submission.submissionText?.trim();
  const isGradeableFile =
    !!submission.fileUrl &&
    !!submission.mimeType &&
    GRADEABLE_FILE_TYPES.test(submission.mimeType);

  if (!hasText && !isGradeableFile) {
    return { ok: false, reason: "not_gradeable" };
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
    const resolvedUrl = await resolveSubmissionFileUrl(submission.fileUrl);
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
    return { ok: false, reason: "file_unavailable" };
  }

  const messages: ModelMessage[] = [{ role: "user", content: userContent }];

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

  return {
    ok: true,
    suggestion: {
      suggestedGrade,
      feedback: suggestion.feedback,
      criterionBreakdown: suggestion.criterionBreakdown,
      confidence,
    },
    totalPoints,
    hasText,
    fileIncluded,
  };
}
