import { getSession } from "@/lib/auth/server";
import { pgDb } from "@/lib/db/pg/db.pg";
import { FlashcardDeckSchema, FlashcardSchema } from "@/lib/db/pg/schema.pg";
import { recordActivity } from "@/lib/progress/record-activity";
import { eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> },
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const { cardId } = await params;
    const body = await request.json();
    const { rating } = body;

    if (rating !== "again" && rating !== "good") {
      return NextResponse.json(
        { success: false, message: "rating must be 'again' or 'good'" },
        { status: 400 },
      );
    }

    // Fetch card + verify ownership via deck → student
    const [card] = await pgDb
      .select({
        id: FlashcardSchema.id,
        deckId: FlashcardSchema.deckId,
        intervalDays: FlashcardSchema.intervalDays,
        reviewCount: FlashcardSchema.reviewCount,
        lapseCount: FlashcardSchema.lapseCount,
        studentId: FlashcardDeckSchema.studentId,
        courseId: FlashcardDeckSchema.courseId,
        weekNumber: FlashcardDeckSchema.weekNumber,
      })
      .from(FlashcardSchema)
      .innerJoin(
        FlashcardDeckSchema,
        eq(FlashcardSchema.deckId, FlashcardDeckSchema.id),
      )
      .where(eq(FlashcardSchema.id, cardId))
      .limit(1);

    if (!card) {
      return NextResponse.json(
        { success: false, message: "Card not found" },
        { status: 404 },
      );
    }

    if (card.studentId !== session.user.id) {
      return NextResponse.json(
        { success: false, message: "Access denied" },
        { status: 403 },
      );
    }

    // Level A scheduler
    let newIntervalDays: number;
    let nextDueAtExpr;
    let newLapseCount = card.lapseCount;

    if (rating === "again") {
      // Resurface in 10 minutes
      newIntervalDays = 0;
      nextDueAtExpr = sql`CURRENT_TIMESTAMP + INTERVAL '10 minutes'`;
      // Count as lapse if the card had been known before
      if (card.reviewCount > 0) {
        newLapseCount = card.lapseCount + 1;
      }
    } else {
      // "good" — double the interval
      if (card.intervalDays === 0) {
        newIntervalDays = 1;
      } else {
        newIntervalDays = card.intervalDays * 2;
      }
      nextDueAtExpr = sql`CURRENT_TIMESTAMP + make_interval(days => ${newIntervalDays})`;
    }

    const [updated] = await pgDb
      .update(FlashcardSchema)
      .set({
        intervalDays: newIntervalDays,
        nextDueAt: nextDueAtExpr,
        reviewCount: card.reviewCount + 1,
        lapseCount: newLapseCount,
        lastRating: rating,
        lastReviewedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(FlashcardSchema.id, cardId))
      .returning();

    // Fire-and-forget: record progress activity
    recordActivity({
      studentId: session.user.id,
      activityType: "flashcard_reviewed",
      courseId: card.courseId,
      weekNumber: card.weekNumber,
      entityId: cardId,
      entityMetadata: { rating, deckId: card.deckId },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        intervalDays: updated.intervalDays,
        nextDueAt: updated.nextDueAt,
        reviewCount: updated.reviewCount,
        lapseCount: updated.lapseCount,
        lastRating: updated.lastRating,
      },
    });
  } catch (error) {
    console.error("POST /api/flashcards/cards/[cardId]/review error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
