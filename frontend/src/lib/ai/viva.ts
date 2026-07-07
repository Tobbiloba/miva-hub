import "server-only";

import { generateObject } from "ai";
import { z } from "zod";

import { customModelProvider } from "@/lib/ai/models";
import globalLogger from "logger";
import { recordAIDecision } from "./decision-ledger";

const logger = globalLogger.withDefaults({ message: "Viva Coach: " });

/** Half-cascade Live model: reliable transcripts + tool support on free tier. */
export const VIVA_LIVE_MODEL = "gemini-live-2.5-flash-preview";
export const VIVA_SCORING_MODEL = "gemini-2.5-flash";

// Keep the examiner grounding well inside the Live model's context window
// while leaving room for a long spoken conversation.
const MAX_VIVA_CONTEXT_CHARS = 60_000;

export interface VivaTurn {
  role: "examiner" | "student";
  text: string;
}

/**
 * System instruction for the live examiner. Locked server-side into the
 * ephemeral token's liveConnectConstraints, so the client cannot alter it.
 */
export function buildVivaSystemPrompt(input: {
  courseCode: string;
  courseTitle: string;
  studentName: string;
  focusTopic: string | null;
  contextText: string;
}): string {
  const context =
    input.contextText.length > MAX_VIVA_CONTEXT_CHARS
      ? `${input.contextText.slice(0, MAX_VIVA_CONTEXT_CHARS)}\n[context truncated]`
      : input.contextText;

  return [
    `You are an examiner conducting a spoken oral examination (viva voce) for the university course ${input.courseCode} — ${input.courseTitle}.`,
    `The candidate is ${input.studentName}.`,
    input.focusTopic
      ? `The viva focuses on: ${input.focusTopic}.`
      : "The viva covers the course material below.",
    "",
    "CONDUCT:",
    "- Open by briefly greeting the candidate and asking your first question. Keep the greeting to one sentence.",
    "- Ask ONE question at a time. Questions must be grounded in the course material below — never examine on content outside it.",
    "- Listen to the answer, then probe: ask follow-ups, request justification, present counter-examples, and push back on vague or incorrect claims — exactly like a rigorous but fair human examiner.",
    "- If the candidate is wrong, do not correct them immediately; probe once to let them recover, then move on.",
    "- Escalate difficulty as the candidate demonstrates competence; ease off if they are struggling, but never give away answers.",
    "- Keep each of your spoken turns under 30 seconds. This is the candidate's exam, not your lecture.",
    "- Cover 4-6 distinct questions in a session, then tell the candidate the viva is complete and they may end the session for their results.",
    "- Speak naturally and clearly. Do not use markdown, lists, or stage directions — everything you produce is spoken aloud.",
    "",
    "COURSE MATERIAL (the only examinable content):",
    context,
  ].join("\n");
}

// ── Post-session rubric scoring ─────────────────────────────────────────────

const rubricSchema = z.object({
  criteria: z
    .array(
      z.object({
        name: z.enum([
          "conceptual_understanding",
          "accuracy",
          "depth_of_reasoning",
          "communication",
          "responsiveness_to_probing",
        ]),
        score: z
          .number()
          .int()
          .min(0)
          .max(20)
          .describe("0-20 for this criterion"),
        comment: z
          .string()
          .describe(
            "1-2 sentence justification citing what the candidate said",
          ),
      }),
    )
    .length(5),
  overallScore: z.number().int().min(0).max(100),
  verdict: z.enum(["distinction", "pass", "borderline", "fail"]),
  strengths: z.array(z.string()).min(1).max(4),
  improvements: z.array(z.string()).min(1).max(4),
  summary: z
    .string()
    .describe("3-4 sentence overall assessment addressed to the student"),
});

export type VivaRubric = z.infer<typeof rubricSchema>;

/**
 * Grade a completed viva from its transcript. Separate from the live session:
 * grading from the full transcript with a schema-validated call is more
 * consistent than asking the live voice model to score itself mid-stream.
 */
export async function scoreVivaTranscript(input: {
  sessionId: string;
  studentId: string;
  universityId: string | null;
  courseCode: string;
  courseTitle: string;
  focusTopic: string | null;
  transcript: VivaTurn[];
}): Promise<VivaRubric> {
  const model = await customModelProvider.getModel({
    provider: "google",
    model: VIVA_SCORING_MODEL,
  });

  const transcriptText = input.transcript
    .map(
      (t) => `${t.role === "examiner" ? "EXAMINER" : "CANDIDATE"}: ${t.text}`,
    )
    .join("\n");

  const { object: rubric } = await generateObject({
    model,
    schema: rubricSchema,
    system:
      "You are a senior external examiner moderating oral examinations. Grade strictly from the transcript — only credit what the candidate actually demonstrated. Be fair but rigorous; an empty or evasive performance fails.",
    prompt: [
      `Course: ${input.courseCode} — ${input.courseTitle}`,
      input.focusTopic ? `Viva focus: ${input.focusTopic}` : "",
      "",
      "Grade this viva transcript against the rubric.",
      "",
      transcriptText,
    ].join("\n"),
  });

  await recordAIDecision({
    universityId: input.universityId,
    decisionType: "grading",
    actor: "viva-coach",
    subjectType: "viva_session",
    subjectId: input.sessionId,
    userId: input.studentId,
    model: VIVA_SCORING_MODEL,
    inputSummary: `Viva (${input.courseCode}) — ${input.transcript.length} spoken turns${input.focusTopic ? `, focus: ${input.focusTopic}` : ""}`,
    decision: `action: scored viva ${rubric.overallScore}/100 (${rubric.verdict})`,
    confidence: 1,
    status: "executed",
    metadata: { verdict: rubric.verdict, overallScore: rubric.overallScore },
  }).catch((error) => logger.warn("ledger write failed", error));

  return rubric;
}
