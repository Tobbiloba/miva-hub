import "server-only";

import { randomBytes } from "node:crypto";

import { generateObject } from "ai";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { recordAIDecision } from "@/lib/ai/decision-ledger";
import { customModelProvider } from "@/lib/ai/models";
import { pgDb } from "lib/db/pg/db.pg";
import {
  type CredentialCompetency,
  type MicroCredentialEntity,
  MicroCredentialSchema,
} from "lib/db/pg/schema.pg";
import globalLogger from "logger";

const logger = globalLogger.withDefaults({ message: "AI Credential: " });

export const CREDENTIAL_MODEL = "gemini-2.5-flash";

// ── Evidence gathering ──────────────────────────────────────────────────────

export interface CredentialEvidence {
  avgGradePct: number | null;
  gradedCount: number;
  bestVivaScore: number | null;
  completedVivas: number;
  vivaRubric: unknown | null;
  concepts: { name: string; masteryPct: number; attempts: number }[];
  studyMinutesTotal: number;
}

/**
 * Aggregate every graded artefact for one student in one course. This is the
 * factual basis of the credential — the AI only interprets, never invents.
 */
export async function gatherCredentialEvidence(
  studentId: string,
  courseId: string,
): Promise<CredentialEvidence> {
  const result = await pgDb.execute<{
    avg_grade_pct: string | null;
    graded_count: string;
    best_viva_score: string | null;
    completed_vivas: string;
    viva_rubric: unknown | null;
    study_minutes: string;
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
        SELECT MAX(vs.overall_score)
        FROM viva_session vs
        WHERE vs.student_id = ${studentId}
          AND vs.course_id = ${courseId}
          AND vs.status = 'completed'
          AND vs.overall_score IS NOT NULL
      ) AS best_viva_score,
      (
        SELECT COUNT(*)
        FROM viva_session vs
        WHERE vs.student_id = ${studentId}
          AND vs.course_id = ${courseId}
          AND vs.status = 'completed'
          AND vs.overall_score IS NOT NULL
      ) AS completed_vivas,
      (
        SELECT vs.rubric
        FROM viva_session vs
        WHERE vs.student_id = ${studentId}
          AND vs.course_id = ${courseId}
          AND vs.status = 'completed'
          AND vs.overall_score IS NOT NULL
        ORDER BY vs.overall_score DESC
        LIMIT 1
      ) AS viva_rubric,
      (
        SELECT COALESCE(SUM(ss.duration_minutes), 0)
        FROM student_study_sessions ss
        WHERE ss.student_id = ${studentId} AND ss.course_id = ${courseId}
      ) AS study_minutes
  `);
  const row = result.rows?.[0];

  const mastery = await pgDb.execute<{
    concept_name: string;
    mastery_pct: string;
    total_attempts: number;
  }>(sql`
    SELECT concept_name, ROUND(mastery_level * 100, 0) AS mastery_pct, total_attempts
    FROM concept_mastery
    WHERE student_id = ${studentId}
      AND course_id = ${courseId}
      AND total_attempts >= 2
    ORDER BY mastery_level DESC
    LIMIT 10
  `);

  return {
    avgGradePct:
      row?.avg_grade_pct == null ? null : parseFloat(row.avg_grade_pct),
    gradedCount: parseInt(String(row?.graded_count ?? "0"), 10),
    bestVivaScore:
      row?.best_viva_score == null
        ? null
        : parseInt(String(row.best_viva_score), 10),
    completedVivas: parseInt(String(row?.completed_vivas ?? "0"), 10),
    vivaRubric: row?.viva_rubric ?? null,
    concepts: (mastery.rows ?? []).map((r) => ({
      name: r.concept_name,
      masteryPct: parseFloat(r.mastery_pct),
      attempts: r.total_attempts,
    })),
    studyMinutesTotal: parseInt(String(row?.study_minutes ?? "0"), 10),
  };
}

/** A credential must stand on real graded evidence. */
export function hasSufficientEvidence(evidence: CredentialEvidence): boolean {
  return evidence.gradedCount > 0 || evidence.completedVivas > 0;
}

export function summarizeEvidence(evidence: CredentialEvidence): string {
  const parts: string[] = [];
  if (evidence.avgGradePct !== null) {
    parts.push(
      `average graded score ${evidence.avgGradePct}% across ${evidence.gradedCount} assignment submission(s)`,
    );
  }
  if (evidence.bestVivaScore !== null) {
    parts.push(
      `best oral examination (viva) score ${evidence.bestVivaScore}/100 across ${evidence.completedVivas} completed session(s)`,
    );
  }
  if (evidence.concepts.length > 0) {
    parts.push(
      `concept mastery: ${evidence.concepts
        .map((c) => `${c.name} ${c.masteryPct}% (${c.attempts} attempts)`)
        .join(", ")}`,
    );
  }
  if (evidence.studyMinutesTotal > 0) {
    parts.push(`${evidence.studyMinutesTotal} tracked study minutes`);
  }
  return parts.join(". ");
}

// ── Issuance ────────────────────────────────────────────────────────────────

// No array .min/.max: Gemini structured output fails the whole response on
// bound violations. Bounds live in the descriptions; we clamp in code.
const assessmentSchema = z.object({
  summary: z
    .string()
    .describe(
      "3-4 sentence third-person competency assessment for the public certificate. Professional registrar tone. Reference the actual evidence (scores, concepts) — never invent achievements.",
    ),
  overallLevel: z
    .enum(["developing", "proficient", "distinction"])
    .describe(
      "distinction: strong evidence (viva ≥ 80 or avg ≥ 70 with solid mastery); proficient: adequate evidence (viva ≥ 60 or avg ≥ 50); developing: evidence exists but is weak.",
    ),
  competencies: z
    .array(
      z.object({
        name: z.string().describe("Competency or concept name."),
        level: z.enum(["developing", "proficient", "distinction"]),
        evidence: z
          .string()
          .describe(
            "One sentence citing the specific evidence for this level.",
          ),
      }),
    )
    .describe("2-6 competencies, drawn only from the evidence provided."),
});

export type IssueResult =
  | { status: "issued"; credential: MicroCredentialEntity }
  | { status: "existing"; credential: MicroCredentialEntity }
  | { status: "insufficient_evidence" };

/**
 * Issue (or return) the student's micro-credential for a course. Credentials
 * are immutable once issued — re-requests return the existing one.
 */
export async function issueCredential(
  studentId: string,
  studentName: string,
  course: {
    id: string;
    universityId: string | null;
    courseCode: string;
    title: string;
  },
): Promise<IssueResult> {
  const [existing] = await pgDb
    .select()
    .from(MicroCredentialSchema)
    .where(
      and(
        eq(MicroCredentialSchema.studentId, studentId),
        eq(MicroCredentialSchema.courseId, course.id),
      ),
    )
    .limit(1);
  if (existing) return { status: "existing", credential: existing };

  const evidence = await gatherCredentialEvidence(studentId, course.id);
  if (!hasSufficientEvidence(evidence)) {
    return { status: "insufficient_evidence" };
  }
  const evidenceSummary = summarizeEvidence(evidence);

  const model = await customModelProvider.getModel({
    provider: "google",
    model: CREDENTIAL_MODEL,
  });
  const { object: assessment } = await generateObject({
    model,
    schema: assessmentSchema,
    prompt: [
      `Write the competency assessment for a verifiable micro-credential in ${course.courseCode} — ${course.title} on the Askly platform.`,
      `Student: ${studentName}`,
      "",
      "GRADED EVIDENCE (assess ONLY from this):",
      evidenceSummary,
      evidence.vivaRubric
        ? `Best viva rubric detail: ${JSON.stringify(evidence.vivaRubric).slice(0, 2000)}`
        : "",
      "",
      "Rules: honest and evidence-bound — a 40% average is 'developing', not 'proficient'. Cite numbers. This text appears on a public verification page.",
    ]
      .filter(Boolean)
      .join("\n"),
  });

  const competencies: CredentialCompetency[] = assessment.competencies
    .slice(0, 6)
    .map((c) => ({
      name: c.name,
      level: c.level,
      evidence: c.evidence,
    }));

  const [inserted] = await pgDb
    .insert(MicroCredentialSchema)
    .values({
      studentId,
      courseId: course.id,
      title: `${course.courseCode} — ${course.title}`,
      summary: assessment.summary,
      overallLevel: assessment.overallLevel,
      competencies,
      evidenceSummary,
      verificationCode: randomBytes(16).toString("hex"),
      model: CREDENTIAL_MODEL,
    })
    .onConflictDoNothing({
      target: [MicroCredentialSchema.studentId, MicroCredentialSchema.courseId],
    })
    .returning();

  await recordAIDecision({
    universityId: course.universityId ?? null,
    decisionType: "grading",
    actor: "credential-assessor",
    subjectType: "student",
    subjectId: studentId,
    userId: studentId,
    model: CREDENTIAL_MODEL,
    inputSummary: `Evidence (${course.courseCode}): ${evidenceSummary}`.slice(
      0,
      1000,
    ),
    decision: `action: issued micro-credential at level "${assessment.overallLevel}" with ${competencies.length} competencies`,
    confidence: 0.9,
    status: "executed",
    metadata: { feature: "micro-credential" },
  }).catch((error) => logger.warn("ledger write failed", error));

  if (inserted) return { status: "issued", credential: inserted };
  // Concurrent request won the insert — return theirs
  const [winner] = await pgDb
    .select()
    .from(MicroCredentialSchema)
    .where(
      and(
        eq(MicroCredentialSchema.studentId, studentId),
        eq(MicroCredentialSchema.courseId, course.id),
      ),
    )
    .limit(1);
  return { status: "existing", credential: winner };
}
