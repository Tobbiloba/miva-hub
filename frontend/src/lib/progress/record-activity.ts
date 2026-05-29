import { pgDb } from "@/lib/db/pg/db.pg";
import { StudyActivitySchema } from "@/lib/db/pg/schema.pg";
import { and, eq, gte, sql } from "drizzle-orm";

type ActivityType =
  | "material_viewed"
  | "flashcard_reviewed"
  | "study_guide_generated"
  | "practice_questions_generated"
  | "quiz_viewed"
  | "assignment_viewed";

interface RecordActivityParams {
  studentId: string;
  activityType: ActivityType;
  courseId?: string | null;
  weekNumber?: number | null;
  entityId?: string | null;
  entityMetadata?: Record<string, any> | null;
}

/**
 * Record a study activity event. For material_viewed/quiz_viewed/assignment_viewed,
 * deduplicates to one event per student+entity per calendar day (UTC).
 */
export async function recordActivity(params: RecordActivityParams) {
  const {
    studentId,
    activityType,
    courseId,
    weekNumber,
    entityId,
    entityMetadata,
  } = params;

  // Deduplicate view-type events: once per student+entity per day
  const viewTypes: ActivityType[] = [
    "material_viewed",
    "quiz_viewed",
    "assignment_viewed",
  ];
  if (viewTypes.includes(activityType) && entityId) {
    const todayStart = sql`date_trunc('day', CURRENT_TIMESTAMP AT TIME ZONE 'UTC')`;
    const [existing] = await pgDb
      .select({ id: StudyActivitySchema.id })
      .from(StudyActivitySchema)
      .where(
        and(
          eq(StudyActivitySchema.studentId, studentId),
          eq(StudyActivitySchema.entityId, entityId),
          eq(StudyActivitySchema.activityType, activityType),
          gte(StudyActivitySchema.createdAt, todayStart),
        ),
      )
      .limit(1);

    if (existing) return existing;
  }

  const [inserted] = await pgDb
    .insert(StudyActivitySchema)
    .values({
      studentId,
      activityType,
      courseId: courseId ?? undefined,
      weekNumber: weekNumber ?? undefined,
      entityId: entityId ?? undefined,
      entityMetadata: entityMetadata ?? undefined,
    })
    .returning({ id: StudyActivitySchema.id });

  return inserted;
}
