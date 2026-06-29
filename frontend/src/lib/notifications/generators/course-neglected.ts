import { pgDb } from "@/lib/db/pg/db.pg";
import { sql } from "drizzle-orm";
import { existsTodayForStudent, createNotification } from "./helpers";

export async function generateCourseNeglectedNotifications(): Promise<number> {
  // Find enrolled students × courses where no activity in 7+ days
  const neglected = await pgDb.execute<{
    student_id: string;
    course_id: string;
    course_code: string;
    course_title: string;
    days_since: string;
  }>(sql`
    SELECT
      se.student_id,
      se.course_id,
      c.course_code,
      c.title AS course_title,
      COALESCE(
        EXTRACT(DAY FROM CURRENT_TIMESTAMP - (
          SELECT MAX(sa.created_at)
          FROM study_activity sa
          WHERE sa.student_id = se.student_id AND sa.course_id = se.course_id
        )),
        999
      )::int AS days_since
    FROM student_enrollment se
    JOIN course c ON se.course_id = c.id
    WHERE se.status = 'enrolled'
    GROUP BY se.student_id, se.course_id, c.course_code, c.title
    HAVING COALESCE(
      EXTRACT(DAY FROM CURRENT_TIMESTAMP - (
        SELECT MAX(sa.created_at)
        FROM study_activity sa
        WHERE sa.student_id = se.student_id AND sa.course_id = se.course_id
      )),
      999
    ) >= 7
  `);

  const rows = neglected.rows ?? [];
  let created = 0;

  for (const row of rows) {
    const daysSince = parseInt(row.days_since);

    // Dedup: one per student+course per day
    if (await existsTodayForStudent(row.student_id, "course_neglected", row.course_id))
      continue;

    await createNotification({
      studentId: row.student_id,
      type: "course_neglected",
      title: `Haven't seen you in ${row.course_code}`,
      body:
        daysSince >= 999
          ? `You haven't opened anything in ${row.course_code} yet.`
          : `You haven't opened anything in ${row.course_code} for ${daysSince} days.`,
      entityUrl: `/student/progress`,
      entityId: row.course_id,
      entityMetadata: {
        courseCode: row.course_code,
        daysSince,
      },
    });
    created++;
  }

  return created;
}
