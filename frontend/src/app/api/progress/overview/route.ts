import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { pgDb } from "@/lib/db/pg/db.pg";
import {
  StudyActivitySchema,
  StudentEnrollmentSchema,
  CourseSchema,
  CourseMaterialSchema,
} from "@/lib/db/pg/schema.pg";
import { eq, and, desc, sql, count, countDistinct } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const studentId = session.user.id;

    // Run all queries in parallel
    const [streakResult, activityCounts, enrolledCourses, recentActivity] =
      await Promise.all([
        // 1. Streak: count distinct days working backwards from today (UTC)
        // Streak: get distinct activity days descending, count consecutive from today
        pgDb.execute<{ d: string }>(sql`
          SELECT DISTINCT date_trunc('day', created_at AT TIME ZONE 'UTC')::date AS d
          FROM study_activity
          WHERE student_id = ${studentId}
          ORDER BY d DESC
          LIMIT 365
        `).then(r => {
          const rows = r.rows ?? [];
          if (rows.length === 0) return 0;
          const today = new Date();
          today.setUTCHours(0, 0, 0, 0);
          let streak = 0;
          for (const row of rows) {
            const day = new Date(row.d);
            day.setUTCHours(0, 0, 0, 0);
            const diffDays = Math.round((today.getTime() - day.getTime()) / 86400000);
            if (diffDays === streak) {
              streak++;
            } else {
              break;
            }
          }
          return streak;
        }).catch(() => 0),

        // 2. Activity counts (today + this week)
        pgDb
          .select({
            activitiesToday: sql<number>`COUNT(*) FILTER (
              WHERE date_trunc('day', ${StudyActivitySchema.createdAt} AT TIME ZONE 'UTC') = CURRENT_DATE
            )::int`,
            activitiesThisWeek: sql<number>`COUNT(*) FILTER (
              WHERE ${StudyActivitySchema.createdAt} >= date_trunc('week', CURRENT_TIMESTAMP AT TIME ZONE 'UTC')
            )::int`,
            lastActivityAt: sql<string | null>`MAX(${StudyActivitySchema.createdAt})`,
          })
          .from(StudyActivitySchema)
          .where(eq(StudyActivitySchema.studentId, studentId))
          .then((r) => r[0]),

        // 3. Enrolled courses with coverage data
        getCourseCoverage(studentId),

        // 4. Recent activity feed (last 10)
        pgDb
          .select({
            id: StudyActivitySchema.id,
            activityType: StudyActivitySchema.activityType,
            courseId: StudyActivitySchema.courseId,
            courseCode: CourseSchema.courseCode,
            courseTitle: CourseSchema.title,
            weekNumber: StudyActivitySchema.weekNumber,
            entityMetadata: StudyActivitySchema.entityMetadata,
            createdAt: StudyActivitySchema.createdAt,
          })
          .from(StudyActivitySchema)
          .leftJoin(
            CourseSchema,
            eq(StudyActivitySchema.courseId, CourseSchema.id),
          )
          .where(eq(StudyActivitySchema.studentId, studentId))
          .orderBy(desc(StudyActivitySchema.createdAt))
          .limit(10),
      ]);

    return NextResponse.json({
      success: true,
      data: {
        streakDays: streakResult,
        activitiesToday: activityCounts?.activitiesToday ?? 0,
        activitiesThisWeek: activityCounts?.activitiesThisWeek ?? 0,
        lastActivityAt: activityCounts?.lastActivityAt ?? null,
        courses: enrolledCourses,
        recentActivity,
      },
    });
  } catch (error) {
    console.error("GET /api/progress/overview error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}

async function getCourseCoverage(studentId: string) {
  // Get all enrolled courses
  const enrollments = await pgDb
    .select({
      courseId: CourseSchema.id,
      courseCode: CourseSchema.courseCode,
      courseTitle: CourseSchema.title,
      totalWeeks: CourseSchema.totalWeeks,
    })
    .from(StudentEnrollmentSchema)
    .innerJoin(
      CourseSchema,
      eq(StudentEnrollmentSchema.courseId, CourseSchema.id),
    )
    .where(
      and(
        eq(StudentEnrollmentSchema.studentId, studentId),
        eq(StudentEnrollmentSchema.status, "enrolled"),
      ),
    )
    .orderBy(desc(StudentEnrollmentSchema.academicYear));

  if (enrollments.length === 0) return [];

  const courseIds = enrollments.map((e) => e.courseId);

  // For each course: count total published materials and viewed materials
  const courseCoverage = await Promise.all(
    courseIds.map(async (courseId) => {
      const enrollment = enrollments.find((e) => e.courseId === courseId)!;

      const [materialCounts, weekActivity, lastTouched] = await Promise.all([
        // Total published materials vs viewed by this student
        pgDb
          .select({
            totalMaterials: count(CourseMaterialSchema.id),
            viewedMaterials: sql<number>`COUNT(DISTINCT CASE
              WHEN ${CourseMaterialSchema.id} IN (
                SELECT entity_id FROM study_activity
                WHERE student_id = ${studentId}
                  AND course_id = ${courseId}
                  AND activity_type IN ('material_viewed', 'quiz_viewed', 'assignment_viewed')
                  AND entity_id IS NOT NULL
              ) THEN ${CourseMaterialSchema.id}
            END)::int`,
          })
          .from(CourseMaterialSchema)
          .where(
            and(
              eq(CourseMaterialSchema.courseId, courseId),
              eq(CourseMaterialSchema.isPublished, true),
            ),
          )
          .then((r) => r[0]),

        // Which weeks the student has touched
        pgDb
          .select({
            weekNumber: StudyActivitySchema.weekNumber,
          })
          .from(StudyActivitySchema)
          .where(
            and(
              eq(StudyActivitySchema.studentId, studentId),
              eq(StudyActivitySchema.courseId, courseId),
            ),
          )
          .groupBy(StudyActivitySchema.weekNumber),

        // Last activity in this course
        pgDb
          .select({
            lastAt: sql<string | null>`MAX(${StudyActivitySchema.createdAt})`,
          })
          .from(StudyActivitySchema)
          .where(
            and(
              eq(StudyActivitySchema.studentId, studentId),
              eq(StudyActivitySchema.courseId, courseId),
            ),
          )
          .then((r) => r[0]?.lastAt ?? null),
      ]);

      const totalMaterials = materialCounts?.totalMaterials ?? 0;
      const viewedMaterials = materialCounts?.viewedMaterials ?? 0;
      const coveragePct =
        totalMaterials > 0
          ? Math.round((viewedMaterials / totalMaterials) * 100)
          : null; // null signals "no materials published yet"

      const weeksTouched = weekActivity
        .map((w) => w.weekNumber)
        .filter((w): w is number => w != null)
        .sort((a, b) => a - b);

      const totalWeeks = enrollment.totalWeeks ?? 16;
      const allWeeks = Array.from({ length: totalWeeks }, (_, i) => i + 1);
      const weeksUntouched = allWeeks.filter((w) => !weeksTouched.includes(w));

      return {
        courseId,
        courseCode: enrollment.courseCode,
        courseTitle: enrollment.courseTitle,
        totalMaterials,
        viewedMaterials,
        coveragePct,
        weeksTouched,
        weeksUntouched,
        lastTouchedAt: lastTouched,
      };
    }),
  );

  return courseCoverage;
}
