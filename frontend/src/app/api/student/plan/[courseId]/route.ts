import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getEnrolledCourse } from "@/lib/ai/course-tutor-context";
import { generateStudyPlan } from "@/lib/ai/study-plan";
import { getSession } from "auth/server";
import { pgDb } from "lib/db/pg/db.pg";
import { StudyPlanSchema } from "lib/db/pg/schema.pg";
import { checkRateLimit, rateLimitResponse } from "lib/rate-limit";
import globalLogger from "logger";

const logger = globalLogger.withDefaults({ message: "Study Plan API: " });

export const maxDuration = 60;

function serialize(plan: typeof StudyPlanSchema.$inferSelect) {
  return {
    weeklyGoal: plan.weeklyGoal,
    rationale: plan.rationale,
    focusConcepts: plan.focusConcepts,
    days: plan.days,
    signalsSummary: plan.signalsSummary,
    generatedAt: plan.generatedAt,
  };
}

/**
 * GET /api/student/plan/[courseId] — the student's current weekly study plan
 * for this course, or { plan: null } when none has been generated yet.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> },
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { courseId } = await params;
    if (!z.string().uuid().safeParse(courseId).success) {
      return NextResponse.json({ error: "Invalid course id" }, { status: 400 });
    }

    // Enrollment gate (identity from session, never the request)
    const course = await getEnrolledCourse(session.user.id, courseId);
    if (!course) {
      return NextResponse.json(
        { error: "Course not found or you are not enrolled in it" },
        { status: 403 },
      );
    }

    const [plan] = await pgDb
      .select()
      .from(StudyPlanSchema)
      .where(
        and(
          eq(StudyPlanSchema.studentId, session.user.id),
          eq(StudyPlanSchema.courseId, courseId),
        ),
      )
      .limit(1);

    return NextResponse.json({ plan: plan ? serialize(plan) : null });
  } catch (error) {
    logger.error("failed to load study plan", error);
    return NextResponse.json(
      { error: "Failed to load study plan" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/student/plan/[courseId] — (re)generate the weekly study plan from
 * the student's live performance signals. Rate limited: plans are meant to be
 * refreshed after new work lands, not spammed.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> },
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { courseId } = await params;
    if (!z.string().uuid().safeParse(courseId).success) {
      return NextResponse.json({ error: "Invalid course id" }, { status: 400 });
    }

    const rateLimit = checkRateLimit(`study-plan:${session.user.id}`, 3, 3600);
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

    const course = await getEnrolledCourse(session.user.id, courseId);
    if (!course) {
      return NextResponse.json(
        { error: "Course not found or you are not enrolled in it" },
        { status: 403 },
      );
    }

    const plan = await generateStudyPlan(session.user.id, course);
    return NextResponse.json({ plan: serialize(plan) });
  } catch (error) {
    logger.error("failed to generate study plan", error);
    return NextResponse.json(
      { error: "Failed to generate study plan" },
      { status: 500 },
    );
  }
}
