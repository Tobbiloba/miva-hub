import { getApiSession } from "@/lib/auth/server";
import { pgDb } from "@/lib/db/pg/db.pg";
import {
  CourseSchema,
  FlashcardDeckSchema,
  FlashcardSchema,
  StudentEnrollmentSchema,
} from "@/lib/db/pg/schema.pg";
import { and, desc, eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export async function GET() {
  try {
    const session = await getApiSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
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
      // Decks saved from a general chat have no course
      .leftJoin(CourseSchema, eq(FlashcardDeckSchema.courseId, CourseSchema.id))
      .where(eq(FlashcardDeckSchema.studentId, session.user.id))
      .orderBy(desc(FlashcardDeckSchema.createdAt));

    return NextResponse.json({ success: true, data: decks });
  } catch (error) {
    console.error("GET /api/flashcards/decks error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}

const SaveDeckSchema = z.object({
  title: z.string().trim().min(1).max(200),
  courseCode: z.string().trim().max(20).nullish(),
  /** "<messageId>:<toolCallId>" of the chat flashcards being saved */
  chatSource: z.string().max(200),
  cards: z
    .array(
      z.object({
        front: z.string().trim().min(1).max(2000),
        back: z.string().trim().min(1).max(4000),
      }),
    )
    .min(1)
    .max(200),
});

/**
 * POST /api/flashcards/decks — save flashcards the chat made into a
 * spaced-repetition deck. Idempotent per chat flashcards (chatSource): saving
 * the same set again returns the deck from the first save. The deck is tied
 * to a course only when it's one the student is enrolled in.
 */
export async function POST(request: NextRequest) {
  const session = await getApiSession();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }
  const studentId = session.user.id;

  const parsed = SaveDeckSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "Invalid deck" },
      { status: 400 },
    );
  }
  const { title, courseCode, chatSource, cards } = parsed.data;

  const [existing] = await pgDb
    .select({ id: FlashcardDeckSchema.id })
    .from(FlashcardDeckSchema)
    .where(
      and(
        eq(FlashcardDeckSchema.studentId, studentId),
        eq(FlashcardDeckSchema.chatSource, chatSource),
      ),
    )
    .limit(1);
  if (existing) {
    return NextResponse.json({
      success: true,
      deckId: existing.id,
      alreadySaved: true,
    });
  }

  let courseId: string | null = null;
  if (courseCode) {
    const [course] = await pgDb
      .select({ id: CourseSchema.id })
      .from(StudentEnrollmentSchema)
      .innerJoin(
        CourseSchema,
        eq(CourseSchema.id, StudentEnrollmentSchema.courseId),
      )
      .where(
        and(
          eq(StudentEnrollmentSchema.studentId, studentId),
          eq(StudentEnrollmentSchema.status, "enrolled"),
          eq(CourseSchema.courseCode, courseCode.toUpperCase()),
        ),
      )
      .limit(1);
    courseId = course?.id ?? null;
  }

  const deckId = await pgDb.transaction(async (tx) => {
    const [deck] = await tx
      .insert(FlashcardDeckSchema)
      .values({
        studentId,
        courseId,
        title,
        chatSource,
        cardCount: cards.length,
      })
      // A concurrent save of the same set already made the deck
      .onConflictDoNothing({
        target: [FlashcardDeckSchema.studentId, FlashcardDeckSchema.chatSource],
      })
      .returning({ id: FlashcardDeckSchema.id });
    if (!deck) return null;
    await tx
      .insert(FlashcardSchema)
      .values(cards.map((c) => ({ deckId: deck.id, ...c })));
    return deck.id;
  });

  if (!deckId) {
    const [raced] = await pgDb
      .select({ id: FlashcardDeckSchema.id })
      .from(FlashcardDeckSchema)
      .where(
        and(
          eq(FlashcardDeckSchema.studentId, studentId),
          eq(FlashcardDeckSchema.chatSource, chatSource),
        ),
      )
      .limit(1);
    return NextResponse.json({
      success: true,
      deckId: raced?.id,
      alreadySaved: true,
    });
  }

  return NextResponse.json(
    { success: true, deckId, alreadySaved: false },
    { status: 201 },
  );
}
