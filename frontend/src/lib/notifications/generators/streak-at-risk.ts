import { pgDb } from "@/lib/db/pg/db.pg";
import { sql } from "drizzle-orm";
import { createNotification, existsTodayForStudent } from "./helpers";

export async function generateStreakAtRiskNotifications(): Promise<number> {
  // Find students who have a streak >= 2 (activity yesterday and day before)
  // but NO activity today. We use UTC since we don't have per-student timezones yet.
  const result = await pgDb.execute<{ student_id: string; streak: string }>(sql`
    WITH students_with_yesterday AS (
      SELECT DISTINCT student_id
      FROM study_activity
      WHERE date_trunc('day', created_at AT TIME ZONE 'UTC') = CURRENT_DATE - INTERVAL '1 day'
    ),
    students_without_today AS (
      SELECT swy.student_id
      FROM students_with_yesterday swy
      WHERE NOT EXISTS (
        SELECT 1 FROM study_activity sa
        WHERE sa.student_id = swy.student_id
          AND date_trunc('day', sa.created_at AT TIME ZONE 'UTC') = CURRENT_DATE
      )
    )
    SELECT swt.student_id,
      (
        SELECT COUNT(DISTINCT to_char(date_trunc('day', sa2.created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD'))
        FROM study_activity sa2
        WHERE sa2.student_id = swt.student_id
          AND sa2.created_at >= CURRENT_DATE - INTERVAL '60 days'
      )::text AS streak
    FROM students_without_today swt
  `);

  const rows = result.rows ?? [];
  let created = 0;

  for (const row of rows) {
    const studentId = row.student_id;

    // Actually calculate the real streak (consecutive days ending yesterday)
    const dayResult = await pgDb.execute<{ d: string }>(sql`
      SELECT DISTINCT to_char(date_trunc('day', created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS d
      FROM study_activity
      WHERE student_id = ${studentId}
      ORDER BY d DESC
      LIMIT 365
    `);

    const days = dayResult.rows ?? [];
    if (days.length === 0) continue;

    const now = new Date();
    // Since these students have NO activity today, we check the streak ending yesterday
    const yesterdayStr = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate() - 1).padStart(2, "0")}`;
    const yesterdayMs = Date.parse(yesterdayStr + "T00:00:00Z");
    let streak = 0;
    for (const d of days) {
      const dayMs = Date.parse(d.d + "T00:00:00Z");
      const diffDays = Math.round((yesterdayMs - dayMs) / 86400000);
      if (diffDays === streak) streak++;
      else break;
    }

    if (streak < 2) continue;

    // Dedup: one per student per day
    if (await existsTodayForStudent(studentId, "streak_at_risk")) continue;

    await createNotification({
      studentId,
      type: "streak_at_risk",
      title: "Don't lose your streak",
      body: `You're on a ${streak}-day streak. A quick flashcard review keeps it alive.`,
      entityUrl: "/student/flashcards",
      entityMetadata: { streak },
    });
    created++;
  }

  return created;
}
