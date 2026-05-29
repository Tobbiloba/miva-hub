import { pgDb } from "@/lib/db/pg/db.pg";
import {
  FlashcardSchema,
  FlashcardDeckSchema,
  StudyActivitySchema,
  CourseSchema,
} from "@/lib/db/pg/schema.pg";
import { eq, and, lte, sql, count } from "drizzle-orm";
import { existsTodayForStudent, createNotification } from "./helpers";

export async function generateFlashcardsDueNotifications(): Promise<number> {
  // Find decks with due cards where the student hasn't reviewed in 24h
  const dueDecks = await pgDb.execute<{
    student_id: string;
    deck_id: string;
    deck_title: string;
    course_code: string;
    due_count: string;
  }>(sql`
    SELECT
      fd.student_id,
      fd.id AS deck_id,
      fd.title AS deck_title,
      c.course_code,
      COUNT(f.id)::text AS due_count
    FROM flashcard_deck fd
    JOIN flashcard f ON f.deck_id = fd.id
    JOIN course c ON fd.course_id = c.id
    WHERE f.next_due_at <= CURRENT_TIMESTAMP
      AND NOT EXISTS (
        SELECT 1 FROM study_activity sa
        WHERE sa.student_id = fd.student_id
          AND sa.activity_type = 'flashcard_reviewed'
          AND sa.created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
      )
    GROUP BY fd.student_id, fd.id, fd.title, c.course_code
    HAVING COUNT(f.id) > 0
  `);

  const rows = dueDecks.rows ?? [];
  let created = 0;

  for (const row of rows) {
    const dueCount = parseInt(row.due_count);

    // Dedup: one per student+deck per day
    if (await existsTodayForStudent(row.student_id, "flashcards_due", row.deck_id))
      continue;

    await createNotification({
      studentId: row.student_id,
      type: "flashcards_due",
      title: `${dueCount} flashcard${dueCount !== 1 ? "s" : ""} due for review`,
      body: "Spaced repetition works best on schedule.",
      entityUrl: `/student/flashcards/${row.deck_id}`,
      entityId: row.deck_id,
      entityMetadata: {
        dueCount,
        courseCode: row.course_code,
        deckTitle: row.deck_title,
      },
    });
    created++;
  }

  return created;
}
