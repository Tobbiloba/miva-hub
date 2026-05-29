import { pgDb } from "@/lib/db/pg/db.pg";
import { StudyActivitySchema, UserSchema } from "@/lib/db/pg/schema.pg";
import { eq, sql } from "drizzle-orm";
import { existsTodayForStudent, createNotification } from "./helpers";

const MILESTONES = [3, 7, 14, 30, 60];

const MESSAGES: Record<number, { title: string; body: string }> = {
  3: { title: "3-day streak!", body: "Three days in a row. Keep it going." },
  7: { title: "7-day streak!", body: "A full week of studying. Solid work." },
  14: { title: "14-day streak!", body: "Two weeks straight. That's commitment." },
  30: { title: "30-day streak!", body: "A whole month of daily studying. Impressive." },
  60: { title: "60-day streak!", body: "Sixty days. You've built a real habit." },
};

export async function generateStreakMilestoneNotifications(): Promise<number> {
  // Get all students who have activity today
  const students = await pgDb
    .select({ studentId: StudyActivitySchema.studentId })
    .from(StudyActivitySchema)
    .where(
      sql`date_trunc('day', ${StudyActivitySchema.createdAt} AT TIME ZONE 'UTC') = CURRENT_DATE`,
    )
    .groupBy(StudyActivitySchema.studentId);

  let created = 0;

  for (const { studentId } of students) {
    // Calculate streak
    const result = await pgDb.execute<{ d: string }>(sql`
      SELECT DISTINCT to_char(date_trunc('day', created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS d
      FROM study_activity
      WHERE student_id = ${studentId}
      ORDER BY d DESC
      LIMIT 365
    `);

    const rows = result.rows ?? [];
    if (rows.length === 0) continue;

    const now = new Date();
    const todayStr = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
    const todayMs = Date.parse(todayStr + "T00:00:00Z");
    let streak = 0;
    for (const row of rows) {
      const dayMs = Date.parse(row.d + "T00:00:00Z");
      const diffDays = Math.round((todayMs - dayMs) / 86400000);
      if (diffDays === streak) streak++;
      else break;
    }

    // Check if streak hits a milestone
    const milestone = MILESTONES.find((m) => m === streak);
    if (!milestone) continue;

    // Dedup: one per student per day
    if (await existsTodayForStudent(studentId, "streak_milestone")) continue;

    const msg = MESSAGES[milestone];
    await createNotification({
      studentId,
      type: "streak_milestone",
      title: msg.title,
      body: msg.body,
      entityUrl: "/student/progress",
      entityMetadata: { streak: milestone },
    });
    created++;
  }

  return created;
}
