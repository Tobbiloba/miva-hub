import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { pgDb } from "@/lib/db/pg/db.pg";
import { FlashcardDeckSchema, CourseSchema } from "@/lib/db/pg/schema.pg";
import { eq, desc, sql } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const decks = await pgDb
      .select({
        id: FlashcardDeckSchema.id,
        title: FlashcardDeckSchema.title,
        courseCode: CourseSchema.courseCode,
        courseTitle: CourseSchema.title,
        weekNumber: FlashcardDeckSchema.weekNumber,
        cardCount: FlashcardDeckSchema.cardCount,
        createdAt: FlashcardDeckSchema.createdAt,
        dueCount: sql<number>`(
          SELECT COUNT(*) FROM flashcard f
          WHERE f.deck_id = ${FlashcardDeckSchema.id}
            AND (f.next_due_at IS NULL OR f.next_due_at <= CURRENT_TIMESTAMP)
        )`.as("due_count"),
      })
      .from(FlashcardDeckSchema)
      .innerJoin(CourseSchema, eq(FlashcardDeckSchema.courseId, CourseSchema.id))
      .where(eq(FlashcardDeckSchema.studentId, session.user.id))
      .orderBy(desc(FlashcardDeckSchema.createdAt));

    return NextResponse.json({ success: true, data: decks });
  } catch (error) {
    console.error("GET /api/flashcards/decks error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
