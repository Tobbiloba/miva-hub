import "server-only";

import { sql } from "drizzle-orm";
import { pgDb } from "lib/db/pg/db.pg";
import { listDeadlines } from "lib/deadlines";
import { STUDENT_TIMEZONE } from "lib/deadlines/time";

/**
 * What the assistant knows about a student, built fresh from the database on
 * every chat turn: their courses, what they've captured, what's due, how
 * their quizzes went, what they asked recently and what they did this week.
 * Everything is the student's own data, scoped by their id from the session.
 */

const DAY = 24 * 60 * 60 * 1000;

export type ActivityEvent = {
  type: string;
  courseCode: string | null;
  meta: Record<string, any>;
  daysAgo: number;
  /** When it happened, ISO (computed in SQL so the DB clock doesn't skew it) */
  at: string;
};

/**
 * The student's activity, newest first. `days` bounds how far back; ages are
 * computed in SQL because study_activity.created_at is zone-less.
 */
export async function getRecentActivity(
  studentId: string,
  opts: { days?: number; limit?: number; courseCode?: string } = {},
): Promise<ActivityEvent[]> {
  const days = opts.days ?? 14;
  const limit = opts.limit ?? 50;
  const result = await pgDb.execute(sql`
    SELECT sa.activity_type AS type,
           c.course_code AS course_code,
           sa.entity_metadata AS meta,
           floor(extract(epoch FROM (now() - sa.created_at)) / 86400)::int AS days_ago,
           -- zone-less, written in the DB session's zone: cast back with it
           sa.created_at::timestamptz AS at
    FROM study_activity sa
    LEFT JOIN course c ON c.id = sa.course_id
    WHERE sa.student_id = ${studentId}
      AND sa.created_at >= now() - make_interval(days => ${days})
      AND (${opts.courseCode ?? null}::text IS NULL
           OR upper(c.course_code) = upper(${opts.courseCode ?? null}::text))
    ORDER BY sa.created_at DESC
    LIMIT ${limit}
  `);
  return (result.rows as any[]).map((r) => ({
    type: r.type,
    courseCode: r.course_code,
    meta: r.meta ?? {},
    daysAgo: r.days_ago,
    at: new Date(r.at).toISOString(),
  }));
}

function shortDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: STUDENT_TIMEZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function ago(days: number): string {
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

/** One line per activity, for the prompt and the my-activity tool. */
export function describeActivity(e: ActivityEvent): string {
  const course = e.courseCode ? `${e.courseCode} ` : "";
  switch (e.type) {
    case "capture_added":
      return `captured ${course}"${e.meta.title ?? "a page"}" (${e.meta.contentType ?? "page"})`;
    case "quiz_completed": {
      const missed: string[] = e.meta.missed ?? [];
      return `scored ${e.meta.percent}% on ${e.meta.kind === "exam" ? "a mock exam" : "a quiz"} "${e.meta.title}"${e.meta.courseCode ? ` (${e.meta.courseCode})` : ""}${
        missed.length
          ? `; missed: ${missed
              .slice(0, 3)
              .map((q) => `"${q.slice(0, 90)}"`)
              .join("; ")}`
          : ""
      }`;
    }
    case "deadline_completed":
      return `finished "${e.meta.title}"${e.meta.onTime === false ? " (after the due date)" : ""}`;
    case "course_question_asked":
      return `asked about ${(e.meta.courses ?? []).join("/") || "their course"}: "${String(e.meta.question ?? "").slice(0, 100)}"${e.meta.found === false ? " (not in their materials)" : ""}`;
    case "flashcard_reviewed":
      return `reviewed a ${course}flashcard`;
    case "material_viewed":
      return `opened ${course}material`;
    default:
      return e.type.replace(/_/g, " ");
  }
}

export async function buildStudentMemory(
  studentId: string,
): Promise<string | null> {
  const now = Date.now();
  const [courses, deadlines, flashcards, activity] = await Promise.all([
    pgDb.execute(sql`
      SELECT c.course_code, c.title,
        (SELECT count(*) FROM course_material m
          WHERE m.course_id = c.id AND m.deleted_at IS NULL
            AND m.rag_index_status = 'indexed'
            AND ((m.owner_user_id IS NULL AND m.is_published)
                 OR m.owner_user_id = ${studentId}))::int AS materials,
        (SELECT count(*) FROM course_material m
          WHERE m.course_id = c.id AND m.deleted_at IS NULL
            AND m.owner_user_id = ${studentId})::int AS own_captures
      FROM student_enrollment se
      JOIN course c ON c.id = se.course_id
      WHERE se.student_id = ${studentId} AND se.status = 'enrolled'
      ORDER BY c.course_code
    `),
    listDeadlines(studentId, {
      from: new Date(now - 14 * DAY),
      to: new Date(now + 14 * DAY),
    }),
    pgDb.execute(sql`
      SELECT count(*)::int AS due
      FROM flashcard f JOIN flashcard_deck d ON d.id = f.deck_id
      WHERE d.student_id = ${studentId}
        AND (f.next_due_at IS NULL OR f.next_due_at <= CURRENT_TIMESTAMP)
    `),
    getRecentActivity(studentId, { days: 14, limit: 60 }),
  ]);

  const courseRows = courses.rows as {
    course_code: string;
    title: string;
    materials: number;
    own_captures: number;
  }[];
  if (courseRows.length === 0 && activity.length === 0) return null;

  const lines: string[] = [];

  if (courseRows.length) {
    lines.push(
      `Courses: ${courseRows
        .map(
          (c) =>
            `${c.course_code} ${c.title} (${c.materials} material${c.materials === 1 ? "" : "s"} Askly can read${c.own_captures ? `, ${c.own_captures} captured by them` : ""})`,
        )
        .join("; ")}`,
    );
    const empty = courseRows.filter((c) => c.materials === 0);
    if (empty.length) {
      lines.push(
        `No materials yet for ${empty.map((c) => c.course_code).join(", ")}: they need to capture these with Askly Capture.`,
      );
    }
  }

  const overdue = deadlines.filter((d) => d.dueAt.getTime() < now);
  const upcoming = deadlines.filter((d) => d.dueAt.getTime() >= now);
  if (overdue.length) {
    lines.push(
      `Overdue (not ticked off): ${overdue
        .slice(0, 5)
        .map(
          (d) =>
            `"${d.title}"${d.course ? ` (${d.course.code})` : ""}, was due ${shortDate(d.dueAt)}`,
        )
        .join("; ")}`,
    );
  }
  lines.push(
    upcoming.length
      ? `Due in the next 2 weeks: ${upcoming
          .slice(0, 6)
          .map(
            (d) =>
              `"${d.title}"${d.course ? ` (${d.course.code})` : ""} ${shortDate(d.dueAt)}`,
          )
          .join("; ")}`
      : "Nothing due in the next 2 weeks that Askly knows of.",
  );

  const due = (flashcards.rows[0] as { due: number } | undefined)?.due ?? 0;
  if (due > 0)
    lines.push(`${due} flashcard${due === 1 ? "" : "s"} due for review.`);

  const quizzes = activity
    .filter((e) => e.type === "quiz_completed")
    .slice(0, 5);
  if (quizzes.length) {
    lines.push(
      `Recent quiz results: ${quizzes.map((e) => `${describeActivity(e)} (${ago(e.daysAgo)})`).join(" | ")}`,
    );
  }
  const questions = activity
    .filter((e) => e.type === "course_question_asked")
    .slice(0, 5);
  if (questions.length) {
    lines.push(
      `Recently asked: ${questions.map((e) => `${describeActivity(e).replace(/^asked about /, "")} (${ago(e.daysAgo)})`).join(" | ")}`,
    );
  }

  const week = activity.filter((e) => e.daysAgo < 7);
  const count = (t: string) => week.filter((e) => e.type === t).length;
  lines.push(
    `This week: ${count("capture_added")} captures, ${count("quiz_completed")} quizzes, ${count("flashcard_reviewed")} flashcards reviewed, ${count("deadline_completed")} deadlines finished.`,
  );

  return lines.join("\n");
}
