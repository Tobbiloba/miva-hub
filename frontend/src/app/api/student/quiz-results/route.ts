import { requireStudent } from "@/lib/auth/student";
import { pgDb } from "@/lib/db/pg/db.pg";
import { CourseSchema, StudentEnrollmentSchema } from "@/lib/db/pg/schema.pg";
import { recordActivity } from "@/lib/progress/record-activity";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const ResultSchema = z.object({
  kind: z.enum(["quiz", "exam"]),
  title: z.string().trim().min(1).max(200),
  courseCode: z.string().trim().max(20).nullish(),
  earnedPoints: z.number().min(0).max(10_000),
  totalPoints: z.number().positive().max(10_000),
  correct: z.number().int().min(0).max(500),
  questionCount: z.number().int().min(1).max(500),
  /** Questions the student got wrong, so the assistant knows their weak spots */
  missed: z.array(z.string().trim().max(300)).max(20).default([]),
});

/**
 * POST /api/student/quiz-results — a quiz or mock exam the chat made was
 * submitted. Recorded as the student's activity so the assistant can track
 * progress and revisit weak topics (lib/memory).
 */
export async function POST(request: NextRequest) {
  const session = await requireStudent();
  if (session instanceof NextResponse) return session;

  const parsed = ResultSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid result" }, { status: 400 });
  }
  const result = parsed.data;
  const studentId = session.user.id;

  let courseId: string | null = null;
  if (result.courseCode) {
    const [course] = await pgDb
      .select({ id: CourseSchema.id })
      .from(StudentEnrollmentSchema)
      .innerJoin(
        CourseSchema,
        eq(CourseSchema.id, StudentEnrollmentSchema.courseId),
      )
      .where(
        and(
          eq(StudentEnrollmentSchema.studentId, studentId),
          eq(StudentEnrollmentSchema.status, "enrolled"),
          eq(CourseSchema.courseCode, result.courseCode.toUpperCase()),
        ),
      )
      .limit(1);
    courseId = course?.id ?? null;
  }

  await recordActivity({
    studentId,
    activityType: "quiz_completed",
    courseId,
    entityMetadata: {
      kind: result.kind,
      title: result.title,
      courseCode: courseId ? result.courseCode?.toUpperCase() : null,
      percent: Math.round((result.earnedPoints / result.totalPoints) * 100),
      correct: result.correct,
      questionCount: result.questionCount,
      missed: result.missed,
    },
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}
