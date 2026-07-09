import { getSession } from "@/lib/auth/server";
import { pgDb } from "@/lib/db/pg/db.pg";
import {
  CourseMaterialSchema,
  CourseSchema,
  StudentEnrollmentSchema,
  StudyActivitySchema,
} from "@/lib/db/pg/schema.pg";
import { and, desc, eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> },
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const studentId = session.user.id;
    const { courseId } = await params;

    // FERPA: verify enrollment
    const [enrollment] = await pgDb
      .select({
        id: StudentEnrollmentSchema.id,
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
          eq(StudentEnrollmentSchema.courseId, courseId),
          eq(StudentEnrollmentSchema.status, "enrolled"),
        ),
      )
      .limit(1);

    if (!enrollment) {
      return NextResponse.json(
        { success: false, message: "Not enrolled in this course" },
        { status: 403 },
      );
    }

    const totalWeeks = enrollment.totalWeeks ?? 16;

    // Run queries in parallel
    const [weekBreakdown, courseActivity, allMaterials] = await Promise.all([
      // Per-week: materials viewed vs total, activity count
      Promise.all(
        Array.from({ length: totalWeeks }, (_, i) => i + 1).map(
          async (week) => {
            const [materialStats] = await pgDb
              .select({
                totalMaterials: sql<number>`COUNT(*)::int`,
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
                  eq(CourseMaterialSchema.weekNumber, week),
                  eq(CourseMaterialSchema.isPublished, true),
                ),
              );

            const [activityStats] = await pgDb
              .select({
                activityCount: sql<number>`COUNT(*)::int`,
                flashcardsReviewed: sql<number>`COUNT(*) FILTER (
                  WHERE ${StudyActivitySchema.activityType} = 'flashcard_reviewed'
                )::int`,
              })
              .from(StudyActivitySchema)
              .where(
                and(
                  eq(StudyActivitySchema.studentId, studentId),
                  eq(StudyActivitySchema.courseId, courseId),
                  eq(StudyActivitySchema.weekNumber, week),
                ),
              );

            return {
              weekNumber: week,
              totalMaterials: materialStats?.totalMaterials ?? 0,
              viewedMaterials: materialStats?.viewedMaterials ?? 0,
              activityCount: activityStats?.activityCount ?? 0,
              flashcardsReviewed: activityStats?.flashcardsReviewed ?? 0,
            };
          },
        ),
      ),

      // Recent activity for this course (last 20)
      pgDb
        .select({
          id: StudyActivitySchema.id,
          activityType: StudyActivitySchema.activityType,
          weekNumber: StudyActivitySchema.weekNumber,
          entityMetadata: StudyActivitySchema.entityMetadata,
          createdAt: StudyActivitySchema.createdAt,
        })
        .from(StudyActivitySchema)
        .where(
          and(
            eq(StudyActivitySchema.studentId, studentId),
            eq(StudyActivitySchema.courseId, courseId),
          ),
        )
        .orderBy(desc(StudyActivitySchema.createdAt))
        .limit(20),

      // All published materials for this course (for the UI to show what's been viewed)
      pgDb
        .select({
          id: CourseMaterialSchema.id,
          title: CourseMaterialSchema.title,
          materialType: CourseMaterialSchema.materialType,
          weekNumber: CourseMaterialSchema.weekNumber,
        })
        .from(CourseMaterialSchema)
        .where(
          and(
            eq(CourseMaterialSchema.courseId, courseId),
            eq(CourseMaterialSchema.isPublished, true),
          ),
        )
        .orderBy(CourseMaterialSchema.weekNumber, CourseMaterialSchema.title),
    ]);

    // Calculate overall course coverage
    const totalMaterials = weekBreakdown.reduce(
      (sum, w) => sum + w.totalMaterials,
      0,
    );
    const viewedMaterials = weekBreakdown.reduce(
      (sum, w) => sum + w.viewedMaterials,
      0,
    );
    const coveragePct =
      totalMaterials > 0
        ? Math.round((viewedMaterials / totalMaterials) * 100)
        : null;

    return NextResponse.json({
      success: true,
      data: {
        courseId,
        courseCode: enrollment.courseCode,
        courseTitle: enrollment.courseTitle,
        totalWeeks,
        coveragePct,
        totalMaterials,
        viewedMaterials,
        weeks: weekBreakdown,
        recentActivity: courseActivity,
        materials: allMaterials,
      },
    });
  } catch (error) {
    console.error("GET /api/progress/course/[courseId] error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
