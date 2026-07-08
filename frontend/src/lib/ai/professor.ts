import "server-only";

import { generateObject, generateText } from "ai";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

import { recordAIDecision } from "@/lib/ai/decision-ledger";
import { customModelProvider } from "@/lib/ai/models";
import { pgDb } from "lib/db/pg/db.pg";
import {
  type CourseProfessorEntity,
  CourseProfessorSchema,
  CourseSchema,
} from "lib/db/pg/schema.pg";
import globalLogger from "logger";

const logger = globalLogger.withDefaults({ message: "AI Professor: " });

export const PROFESSOR_MODEL = "gemini-2.5-flash";

// ── Persona ─────────────────────────────────────────────────────────────────

const personaSchema = z.object({
  name: z
    .string()
    .describe(
      'Full name with honorific, e.g. "Professor Adaeze Obi". Nigerian names preferred — this is a Nigerian university.',
    ),
  title: z
    .string()
    .describe(
      'Short academic title line, e.g. "Professor of Computer Science"',
    ),
  bio: z
    .string()
    .describe(
      "2-3 sentence public bio a student sees: background, what they love about the subject, teaching philosophy.",
    ),
  // No min/max here: Gemini structured output rejects array bound violations
  // as a whole-response failure. We clamp in code instead.
  traits: z
    .array(z.string())
    .describe(
      '2-4 personality traits, e.g. ["warm", "socratic", "story-driven"]',
    ),
  greeting: z
    .string()
    .describe(
      "The first message this professor sends a new student. In-character, welcoming, mentions the course, invites a question. Under 60 words.",
    ),
  personaPrompt: z
    .string()
    .describe(
      "A second-person persona block for a system prompt: who the professor is, how they speak, verbal quirks, how they teach and encourage. 100-180 words.",
    ),
});

/**
 * Return the course's AI professor, generating and persisting the persona on
 * first access. The persona is stable after creation so the professor feels
 * like the same person across chat, voice office hours, and outreach.
 */
export async function getOrCreateProfessor(
  courseId: string,
): Promise<CourseProfessorEntity | null> {
  const [existing] = await pgDb
    .select()
    .from(CourseProfessorSchema)
    .where(eq(CourseProfessorSchema.courseId, courseId))
    .limit(1);
  if (existing) return existing;

  const [course] = await pgDb
    .select({
      id: CourseSchema.id,
      universityId: CourseSchema.universityId,
      courseCode: CourseSchema.courseCode,
      title: CourseSchema.title,
      description: CourseSchema.description,
    })
    .from(CourseSchema)
    .where(eq(CourseSchema.id, courseId))
    .limit(1);
  if (!course) return null;

  const model = await customModelProvider.getModel({
    provider: "google",
    model: PROFESSOR_MODEL,
  });
  const { object: persona } = await generateObject({
    model,
    schema: personaSchema,
    prompt: [
      "Invent a memorable AI professor persona for a university course on the Askly platform.",
      `Course: ${course.courseCode} — ${course.title}`,
      course.description ? `Description: ${course.description}` : "",
      "The persona must be professional but distinctly human: a specific personality, not a generic assistant.",
    ]
      .filter(Boolean)
      .join("\n"),
  });

  // Unique(course_id) makes concurrent first-access safe: one insert wins,
  // the loser falls through to re-select.
  const [inserted] = await pgDb
    .insert(CourseProfessorSchema)
    .values({
      courseId,
      name: persona.name,
      title: persona.title,
      bio: persona.bio,
      traits: persona.traits.slice(0, 4),
      greeting: persona.greeting,
      personaPrompt: persona.personaPrompt,
      model: PROFESSOR_MODEL,
    })
    .onConflictDoNothing({ target: CourseProfessorSchema.courseId })
    .returning();

  await recordAIDecision({
    universityId: course.universityId ?? null,
    decisionType: "content",
    actor: "ai-professor",
    subjectType: "course",
    subjectId: courseId,
    userId: null,
    model: PROFESSOR_MODEL,
    inputSummary: `Persona generation for ${course.courseCode} — ${course.title}`,
    decision: `action: created professor persona "${persona.name}" (${persona.traits.join(", ")})`,
    confidence: 1,
    status: "executed",
    metadata: { feature: "ai-professor" },
  }).catch((error) => logger.warn("ledger write failed", error));

  if (inserted) return inserted;
  const [winner] = await pgDb
    .select()
    .from(CourseProfessorSchema)
    .where(eq(CourseProfessorSchema.courseId, courseId))
    .limit(1);
  return winner ?? null;
}

/** Persona block prepended to tutor rules for chat + voice office hours. */
export function buildProfessorSystemPrompt(
  professor: Pick<CourseProfessorEntity, "name" | "title" | "personaPrompt">,
  course: { courseCode: string; title: string },
  contextText: string,
): string {
  return [
    `You are ${professor.name}, ${professor.title}, the AI professor for ${course.courseCode} — ${course.title} on Askly.`,
    "",
    "PERSONA:",
    professor.personaPrompt,
    "",
    "Strict teaching rules:",
    "- Answer only from the COURSE MATERIALS sources below, citing them inline like [S1].",
    "- If the materials do not cover something, say so plainly — never invent syllabus content, deadlines, or grading policy.",
    "- Teach in character: explain, use your personality, then check understanding with one short follow-up question when appropriate.",
    "- Stay concise and encouraging.",
    "",
    contextText,
  ].join("\n");
}

// ── Struggling-student detection ────────────────────────────────────────────

export interface RiskSignal {
  studentId: string;
  studentName: string;
  avgGradePct: number | null;
  gradedCount: number;
  daysSinceActivity: number | null;
  weakConcepts: string[];
  reasons: string[];
}

const LOW_GRADE_PCT = 50;
const INACTIVE_DAYS = 7;
const WEAK_MASTERY = 0.5;

/**
 * Scan a course's enrolled students for struggle signals:
 * low average grade, prolonged inactivity, or weak concept mastery.
 */
export async function scanStrugglingStudents(
  courseId: string,
): Promise<RiskSignal[]> {
  const result = await pgDb.execute<{
    student_id: string;
    student_name: string;
    avg_grade_pct: string | null;
    graded_count: string;
    days_since_activity: string | null;
    weak_concepts: string[] | null;
  }>(sql`
    SELECT
      se.student_id,
      u.name AS student_name,
      (
        SELECT ROUND(AVG(sub.grade / NULLIF(a.total_points, 0) * 100), 1)
        FROM assignment_submission sub
        JOIN assignment a ON a.id = sub.assignment_id
        WHERE sub.student_id = se.student_id
          AND a.course_id = se.course_id
          AND sub.grade IS NOT NULL
      ) AS avg_grade_pct,
      (
        SELECT COUNT(*)
        FROM assignment_submission sub
        JOIN assignment a ON a.id = sub.assignment_id
        WHERE sub.student_id = se.student_id
          AND a.course_id = se.course_id
          AND sub.grade IS NOT NULL
      ) AS graded_count,
      (
        SELECT EXTRACT(DAY FROM CURRENT_TIMESTAMP - MAX(sa.created_at))::int
        FROM study_activity sa
        WHERE sa.student_id = se.student_id AND sa.course_id = se.course_id
      ) AS days_since_activity,
      (
        SELECT array_agg(cm.concept_name ORDER BY cm.mastery_level)
        FROM concept_mastery cm
        WHERE cm.student_id = se.student_id
          AND cm.course_id = se.course_id
          AND cm.mastery_level < ${WEAK_MASTERY}
          AND cm.total_attempts >= 3
      ) AS weak_concepts
    FROM student_enrollment se
    JOIN "user" u ON u.id = se.student_id
    WHERE se.course_id = ${courseId} AND se.status = 'enrolled'
  `);

  const signals: RiskSignal[] = [];
  for (const row of result.rows ?? []) {
    const avgGradePct =
      row.avg_grade_pct === null ? null : parseFloat(row.avg_grade_pct);
    const daysSinceActivity =
      row.days_since_activity === null
        ? null
        : parseInt(String(row.days_since_activity), 10);
    const weakConcepts = (row.weak_concepts ?? []).slice(0, 5);

    const reasons: string[] = [];
    if (avgGradePct !== null && avgGradePct < LOW_GRADE_PCT) {
      reasons.push(`average graded score ${avgGradePct}%`);
    }
    if (daysSinceActivity !== null && daysSinceActivity >= INACTIVE_DAYS) {
      reasons.push(`no study activity for ${daysSinceActivity} days`);
    }
    if (weakConcepts.length > 0) {
      reasons.push(`weak concepts: ${weakConcepts.join(", ")}`);
    }
    if (reasons.length === 0) continue;

    signals.push({
      studentId: row.student_id,
      studentName: row.student_name,
      avgGradePct,
      gradedCount: parseInt(String(row.graded_count), 10),
      daysSinceActivity,
      weakConcepts,
      reasons,
    });
  }
  return signals;
}

// ── Proactive outreach ──────────────────────────────────────────────────────

/**
 * Generate an in-character outreach message for one struggling student.
 * Short, specific to their signals, and actionable — never shaming.
 */
export async function generateOutreachMessage(
  professor: Pick<CourseProfessorEntity, "name" | "title" | "personaPrompt">,
  course: { courseCode: string; title: string },
  signal: RiskSignal,
): Promise<string> {
  const model = await customModelProvider.getModel({
    provider: "google",
    model: PROFESSOR_MODEL,
  });
  const firstName = signal.studentName.split(" ")[0] || "there";
  const { text } = await generateText({
    model,
    maxOutputTokens: 512,
    system: [
      `You are ${professor.name}, ${professor.title}, the AI professor for ${course.courseCode} — ${course.title}.`,
      "PERSONA:",
      professor.personaPrompt,
      "",
      "You are writing ONE short proactive check-in message to a student your monitoring flagged as struggling.",
      "Rules: warm and specific, never shaming; name what you noticed in plain words; suggest ONE concrete next step on Askly (e.g. ask me a question, review flashcards, book a voice office-hours session); end with an invitation to reply. 60-100 words, plain text, no markdown, no subject line.",
    ].join("\n"),
    prompt: `Student first name: ${firstName}\nWhat monitoring noticed: ${signal.reasons.join("; ")}`,
  });
  return text.trim();
}
