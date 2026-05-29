import { pgDb } from "@/lib/db/pg/db.pg";
import { NotificationSchema, UserSchema } from "@/lib/db/pg/schema.pg";
import { and, eq, gte, sql } from "drizzle-orm";
import { sendEmailWithResult } from "@/lib/email/smtp-service";
import {
  buildNewContentEmail,
  buildCourseNeglectedEmail,
} from "@/lib/email/templates/notification-emails";

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

/** Types that also get delivered via email in v1 */
const EMAIL_ELIGIBLE_TYPES: NotificationType[] = [
  "new_content",
  "course_neglected",
];

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
 * Insert a notification row. If the type is email-eligible, also send
 * an email and update delivered_via to include "email" on success.
 */
export async function createNotification(params: CreateNotificationParams) {
  const [inserted] = await pgDb
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

  // Attempt email delivery for eligible types (fire-and-forget, never blocks)
  if (EMAIL_ELIGIBLE_TYPES.includes(params.type) && inserted) {
    try {
      await sendNotificationEmail(inserted.id, params);
    } catch {
      // Already logged inside sendNotificationEmail — don't propagate
    }
  }

  return [inserted];
}

async function sendNotificationEmail(
  notificationId: string,
  params: CreateNotificationParams,
) {
  // Look up student email + name
  const [user] = await pgDb
    .select({ email: UserSchema.email, name: UserSchema.name })
    .from(UserSchema)
    .where(eq(UserSchema.id, params.studentId))
    .limit(1);

  if (!user?.email) return;

  const firstName = (user.name || "Student").split(" ")[0];
  const meta = params.entityMetadata ?? {};
  let emailContent: { subject: string; html: string; text: string } | null =
    null;

  if (params.type === "new_content") {
    emailContent = buildNewContentEmail({
      firstName,
      courseCode: meta.courseCode ?? "",
      materialTitle: meta.materialTitle ?? params.title,
    });
  } else if (params.type === "course_neglected") {
    emailContent = buildCourseNeglectedEmail({
      firstName,
      courseCode: meta.courseCode ?? "",
      daysSince: meta.daysSince ?? 7,
    });
  }

  if (!emailContent) return;

  const sent = await sendEmailWithResult({
    to: user.email,
    subject: emailContent.subject,
    html: emailContent.html,
    text: emailContent.text,
  });

  if (!sent) return;

  // Only mark as email-delivered on confirmed send
  await pgDb
    .update(NotificationSchema)
    .set({
      deliveredVia: sql`${NotificationSchema.deliveredVia} || '["email"]'::jsonb`,
    })
    .where(eq(NotificationSchema.id, notificationId));
}
