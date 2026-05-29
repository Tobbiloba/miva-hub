import { pgDb } from "@/lib/db/pg/db.pg";
import { NotificationSchema } from "@/lib/db/pg/schema.pg";
import { and, eq, gte, sql } from "drizzle-orm";

type NotificationType =
  | "streak_milestone"
  | "streak_at_risk"
  | "course_neglected"
  | "flashcards_due"
  | "new_content";

interface CreateNotificationParams {
  studentId: string;
  type: NotificationType;
  title: string;
  body: string;
  entityUrl?: string | null;
  entityId?: string | null;
  entityMetadata?: Record<string, any> | null;
}

/**
 * Check if a notification of this type+entity already exists for the student today.
 * Used for time-bound notifications (streak, course_neglected, flashcards_due).
 */
export async function existsTodayForStudent(
  studentId: string,
  type: NotificationType,
  entityId?: string | null,
): Promise<boolean> {
  const todayStart = sql`date_trunc('day', CURRENT_TIMESTAMP AT TIME ZONE 'UTC')`;
  const conditions = [
    eq(NotificationSchema.studentId, studentId),
    eq(NotificationSchema.type, type),
    gte(NotificationSchema.createdAt, todayStart),
  ];
  if (entityId) {
    conditions.push(eq(NotificationSchema.entityId, entityId));
  }

  const [existing] = await pgDb
    .select({ id: NotificationSchema.id })
    .from(NotificationSchema)
    .where(and(...conditions))
    .limit(1);

  return !!existing;
}

/**
 * Check if a one-shot notification of this type+entity already exists (ever).
 * Used for new_content notifications that should fire only once per material.
 */
export async function existsEverForStudent(
  studentId: string,
  type: NotificationType,
  entityId: string,
): Promise<boolean> {
  const [existing] = await pgDb
    .select({ id: NotificationSchema.id })
    .from(NotificationSchema)
    .where(
      and(
        eq(NotificationSchema.studentId, studentId),
        eq(NotificationSchema.type, type),
        eq(NotificationSchema.entityId, entityId),
      ),
    )
    .limit(1);

  return !!existing;
}

/**
 * Insert a notification row.
 */
export async function createNotification(params: CreateNotificationParams) {
  return pgDb
    .insert(NotificationSchema)
    .values({
      studentId: params.studentId,
      type: params.type,
      title: params.title,
      body: params.body,
      entityUrl: params.entityUrl ?? undefined,
      entityId: params.entityId ?? undefined,
      entityMetadata: params.entityMetadata ?? undefined,
    })
    .returning({ id: NotificationSchema.id });
}
