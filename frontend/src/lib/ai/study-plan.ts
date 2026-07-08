import "server-only";

import { generateObject } from "ai";
import { sql } from "drizzle-orm";
import { z } from "zod";

import { recordAIDecision } from "@/lib/ai/decision-ledger";
import { customModelProvider } from "@/lib/ai/models";
import { pgDb } from "lib/db/pg/db.pg";
import {
  type StudyPlanDay,
  type StudyPlanEntity,
  StudyPlanSchema,
} from "lib/db/pg/schema.pg";
import globalLogger from "logger";

const logger = globalLogger.withDefaults({ message: "AI Study Plan: " });

export const STUDY_PLAN_MODEL = "gemini-2.5-flash";

// ── Signal gathering ────────────────────────────────────────────────────────

export interface StudySignals {
  avgGradePct: number | null;
  gradedCount: number;
  weakConcepts: { name: string; masteryPct: number }[];
  strongConcepts: { name: string; masteryPct: number }[];
  dueFlashcards: number;
  totalFlashcards: number;
  daysSinceActivity: number | null;
  studyMinutesLast7Days: number;
  upcomingAssignments: { title: string; type: string; dueInDays: number }[];
  currentWeeks: { weekNumber: number; title: string }[];
}

/**
 * Pull every personalization signal we track for one student in one course:
 * grades, concept mastery, spaced-repetition backlog, recent effort, and
 * upcoming deadlines. This is the evidence the plan is generated from.
 */
export async function gatherStudySignals(
  studentId: string,
  courseId: string,
): Promise<StudySignals> {
  const result = await pgDb.execute<{
    avg_grade_pct: string | null;
    graded_count: string;
    days_since_activity: string | null;
    study_minutes_7d: string;
    due_flashcards: string;
    total_flashcards: string;
  }>(sql`
    SELECT
      (
        SELECT ROUND(AVG(sub.grade / NULLIF(a.total_points, 0) * 100), 1)
        FROM assignment_submission sub
        JOIN assignment a ON a.id = sub.assignment_id
        WHERE sub.student_id = ${studentId}
          AND a.course_id = ${courseId}
          AND sub.grade IS NOT NULL
      ) AS avg_grade_pct,
      (
        SELECT COUNT(*)
        FROM assignment_submission sub
        JOIN assignment a ON a.id = sub.assignment_id
        WHERE sub.student_id = ${studentId}
          AND a.course_id = ${courseId}
          AND sub.grade IS NOT NULL
      ) AS graded_count,
      (
        SELECT EXTRACT(DAY FROM CURRENT_TIMESTAMP - MAX(sa.created_at))::int
        FROM study_activity sa
        WHERE sa.student_id = ${studentId} AND sa.course_id = ${courseId}
      ) AS days_since_activity,
      (
        SELECT COALESCE(SUM(ss.duration_minutes), 0)
        FROM student_study_sessions ss
        WHERE ss.student_id = ${studentId}
          AND ss.course_id = ${courseId}
          AND ss.started_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'
      ) AS study_minutes_7d,
      (
        SELECT COUNT(*)
        FROM flashcard f
        JOIN flashcard_deck d ON d.id = f.deck_id
        WHERE d.student_id = ${studentId}
          AND d.course_id = ${courseId}
          AND (f.next_due_at IS NULL OR f.next_due_at <= CURRENT_TIMESTAMP)
      ) AS due_flashcards,
      (
        SELECT COUNT(*)
        FROM flashcard f
        JOIN flashcard_deck d ON d.id = f.deck_id
        WHERE d.student_id = ${studentId} AND d.course_id = ${courseId}
      ) AS total_flashcards
  `);
  const row = result.rows?.[0];

  const mastery = await pgDb.execute<{
    concept_name: string;
    mastery_pct: string;
  }>(sql`
    SELECT concept_name, ROUND(mastery_level * 100, 0) AS mastery_pct
    FROM concept_mastery
    WHERE student_id = ${studentId}
      AND course_id = ${courseId}
      AND total_attempts >= 2
    ORDER BY mastery_level ASC
  `);
  const concepts = (mastery.rows ?? []).map((r) => ({
    name: r.concept_name,
    masteryPct: parseFloat(r.mastery_pct),
  }));

  const assignments = await pgDb.execute<{
    title: string;
    assignment_type: string;
    due_in_days: string;
  }>(sql`
    SELECT a.title, a.assignment_type,
      CEIL(EXTRACT(EPOCH FROM a.due_date - CURRENT_TIMESTAMP) / 86400)::int AS due_in_days
    FROM assignment a
    WHERE a.course_id = ${courseId}
      AND a.is_published = true
      AND a.due_date > CURRENT_TIMESTAMP
      AND a.due_date <= CURRENT_TIMESTAMP + INTERVAL '14 days'
      AND NOT EXISTS (
        SELECT 1 FROM assignment_submission sub
        WHERE sub.assignment_id = a.id AND sub.student_id = ${studentId}
      )
    ORDER BY a.due_date ASC
    LIMIT 5
  `);

  const weeks = await pgDb.execute<{
    week_number: number;
    title: string;
  }>(sql`
    SELECT week_number, title
    FROM course_week
    WHERE course_id = ${courseId} AND is_published = true
    ORDER BY week_number DESC
    LIMIT 3
  `);

  return {
    avgGradePct:
      row?.avg_grade_pct == null ? null : parseFloat(row.avg_grade_pct),
    gradedCount: parseInt(String(row?.graded_count ?? "0"), 10),
    weakConcepts: concepts.filter((c) => c.masteryPct < 60).slice(0, 6),
    strongConcepts: concepts
      .filter((c) => c.masteryPct >= 80)
      .slice(-4)
      .reverse(),
    dueFlashcards: parseInt(String(row?.due_flashcards ?? "0"), 10),
    totalFlashcards: parseInt(String(row?.total_flashcards ?? "0"), 10),
    daysSinceActivity:
      row?.days_since_activity == null
        ? null
        : parseInt(String(row.days_since_activity), 10),
    studyMinutesLast7Days: parseInt(String(row?.study_minutes_7d ?? "0"), 10),
    upcomingAssignments: (assignments.rows ?? []).map((a) => ({
      title: a.title,
      type: a.assignment_type,
      dueInDays: parseInt(String(a.due_in_days), 10),
    })),
    currentWeeks: (weeks.rows ?? [])
      .map((w) => ({ weekNumber: w.week_number, title: w.title }))
      .reverse(),
  };
}

/** Human-readable one-paragraph summary of the signals, stored for audit. */
export function summarizeSignals(signals: StudySignals): string {
  const parts: string[] = [];
  if (signals.avgGradePct !== null) {
    parts.push(
      `average graded score ${signals.avgGradePct}% over ${signals.gradedCount} submissions`,
    );
  }
  if (signals.weakConcepts.length > 0) {
    parts.push(
      `weak concepts: ${signals.weakConcepts
        .map((c) => `${c.name} (${c.masteryPct}%)`)
        .join(", ")}`,
    );
  }
  if (signals.strongConcepts.length > 0) {
    parts.push(
      `strong concepts: ${signals.strongConcepts.map((c) => c.name).join(", ")}`,
    );
  }
  parts.push(
    `${signals.dueFlashcards}/${signals.totalFlashcards} flashcards due`,
  );
  if (signals.daysSinceActivity !== null) {
    parts.push(`last activity ${signals.daysSinceActivity} day(s) ago`);
  }
  parts.push(`${signals.studyMinutesLast7Days} study minutes in last 7 days`);
  if (signals.upcomingAssignments.length > 0) {
    parts.push(
      `upcoming: ${signals.upcomingAssignments
        .map((a) => `${a.title} (${a.type}, due in ${a.dueInDays}d)`)
        .join("; ")}`,
    );
  }
  return parts.join(". ");
}

// ── Plan generation ─────────────────────────────────────────────────────────

const TASK_TYPES = [
  "flashcards",
  "tutor_session",
  "reading",
  "practice_quiz",
  "office_hours",
  "assignment_prep",
] as const;

// No array .min/.max: Gemini structured output fails the whole response on
// bound violations. Bounds live in the descriptions; we clamp in code.
const planSchema = z.object({
  weeklyGoal: z
    .string()
    .describe("One motivating sentence: what this week should achieve."),
  rationale: z
    .string()
    .describe(
      "2-3 sentences explaining WHY this plan, referencing the student's actual signals (grades, weak concepts, deadlines). Second person.",
    ),
  focusConcepts: z
    .array(z.string())
    .describe("2-5 concepts this week prioritizes, weakest first."),
  days: z
    .array(
      z.object({
        day: z
          .string()
          .describe('Day label, e.g. "Monday". Cover Monday through Sunday.'),
        tasks: z
          .array(
            z.object({
              type: z
                .enum(TASK_TYPES)
                .describe(
                  "flashcards = spaced-repetition review; tutor_session = ask the AI tutor; reading = course materials; practice_quiz = self-test; office_hours = voice session with the AI professor; assignment_prep = work on an upcoming assignment",
                ),
              title: z.string().describe("Short imperative task title."),
              description: z
                .string()
                .describe(
                  "1-2 sentences: exactly what to do and why it helps this student.",
                ),
              concepts: z
                .array(z.string())
                .describe("Concepts this task targets (may be empty)."),
              estimatedMinutes: z
                .number()
                .describe("Realistic estimate, 10-60."),
            }),
          )
          .describe(
            "1-3 tasks for this day. Rest days (0 tasks) are allowed at most once.",
          ),
      }),
    )
    .describe("Exactly 7 entries, Monday through Sunday."),
});

/**
 * Generate and persist a personalized weekly study plan from the student's
 * live performance signals. Upserts: one active plan per student per course.
 */
export async function generateStudyPlan(
  studentId: string,
  course: {
    id: string;
    universityId: string | null;
    courseCode: string;
    title: string;
  },
): Promise<StudyPlanEntity> {
  const signals = await gatherStudySignals(studentId, course.id);
  const signalsSummary = summarizeSignals(signals);

  const model = await customModelProvider.getModel({
    provider: "google",
    model: STUDY_PLAN_MODEL,
  });
  const { object: plan } = await generateObject({
    model,
    schema: planSchema,
    prompt: [
      `Design a personalized 7-day study plan for a student in ${course.courseCode} — ${course.title} on the Askly platform.`,
      "",
      "STUDENT SIGNALS (real data — ground every choice in these):",
      `- Average graded score: ${signals.avgGradePct === null ? "no graded work yet" : `${signals.avgGradePct}%`} (${signals.gradedCount} graded submissions)`,
      `- Weak concepts (mastery < 60%): ${signals.weakConcepts.length ? signals.weakConcepts.map((c) => `${c.name} ${c.masteryPct}%`).join(", ") : "none identified yet"}`,
      `- Strong concepts (≥ 80%): ${signals.strongConcepts.length ? signals.strongConcepts.map((c) => c.name).join(", ") : "none yet"}`,
      `- Flashcards due for review: ${signals.dueFlashcards} of ${signals.totalFlashcards}`,
      `- Days since last study activity: ${signals.daysSinceActivity ?? "never active"}`,
      `- Study time in the last 7 days: ${signals.studyMinutesLast7Days} minutes`,
      `- Upcoming assignments (14 days, not yet submitted): ${signals.upcomingAssignments.length ? signals.upcomingAssignments.map((a) => `${a.title} (${a.type}) due in ${a.dueInDays} day(s)`).join("; ") : "none"}`,
      `- Current course weeks: ${signals.currentWeeks.length ? signals.currentWeeks.map((w) => `W${w.weekNumber}: ${w.title}`).join("; ") : "not published"}`,
      "",
      "Rules:",
      "- Prioritize weak concepts and imminent deadlines; schedule assignment_prep BEFORE due dates with buffer.",
      "- If flashcards are due, schedule flashcards early in the week (spaced repetition decays).",
      "- If the student has been inactive, start with a short, easy win — not a heavy day.",
      "- Total load 30-90 minutes per active day. Be realistic, not aspirational.",
      "- Reference the student's actual numbers in the rationale.",
    ].join("\n"),
  });

  // Clamp everything the schema could not enforce
  const days: StudyPlanDay[] = plan.days.slice(0, 7).map((d) => ({
    day: d.day,
    tasks: d.tasks.slice(0, 3).map((t) => ({
      type: t.type,
      title: t.title,
      description: t.description,
      concepts: t.concepts.slice(0, 5),
      estimatedMinutes: Math.min(
        120,
        Math.max(5, Math.round(t.estimatedMinutes)),
      ),
    })),
  }));
  const focusConcepts = plan.focusConcepts.slice(0, 5);

  const [saved] = await pgDb
    .insert(StudyPlanSchema)
    .values({
      studentId,
      courseId: course.id,
      weeklyGoal: plan.weeklyGoal,
      rationale: plan.rationale,
      focusConcepts,
      days,
      signalsSummary,
      model: STUDY_PLAN_MODEL,
      generatedAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })
    .onConflictDoUpdate({
      target: [StudyPlanSchema.studentId, StudyPlanSchema.courseId],
      set: {
        weeklyGoal: plan.weeklyGoal,
        rationale: plan.rationale,
        focusConcepts,
        days,
        signalsSummary,
        model: STUDY_PLAN_MODEL,
        generatedAt: sql`CURRENT_TIMESTAMP`,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      },
    })
    .returning();

  await recordAIDecision({
    universityId: course.universityId ?? null,
    decisionType: "tutoring",
    actor: "study-planner",
    subjectType: "student",
    subjectId: studentId,
    userId: studentId,
    model: STUDY_PLAN_MODEL,
    inputSummary: `Signals (${course.courseCode}): ${signalsSummary}`.slice(
      0,
      1000,
    ),
    decision: `action: generated weekly study plan — goal "${plan.weeklyGoal}"; focus: ${focusConcepts.join(", ") || "general"}`,
    confidence: 0.85,
    status: "executed",
    metadata: { feature: "study-plan" },
  }).catch((error) => logger.warn("ledger write failed", error));

  return saved;
}
