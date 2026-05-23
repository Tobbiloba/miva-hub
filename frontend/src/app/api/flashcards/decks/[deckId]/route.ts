import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { pgDb } from "@/lib/db/pg/db.pg";
import {
  FlashcardDeckSchema,
  FlashcardSchema,
  CourseSchema,
} from "@/lib/db/pg/schema.pg";
import { eq, and } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ deckId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { deckId } = await params;

    // Fetch deck — enforce ownership
    const [deck] = await pgDb
      .select({
        id: FlashcardDeckSchema.id,
        title: FlashcardDeckSchema.title,
        courseCode: CourseSchema.courseCode,
        courseTitle: CourseSchema.title,
        weekNumber: FlashcardDeckSchema.weekNumber,
        cardCount: FlashcardDeckSchema.cardCount,
        createdAt: FlashcardDeckSchema.createdAt,
      })
      .from(FlashcardDeckSchema)
      .innerJoin(CourseSchema, eq(FlashcardDeckSchema.courseId, CourseSchema.id))
      .where(
        and(
          eq(FlashcardDeckSchema.id, deckId),
          eq(FlashcardDeckSchema.studentId, session.user.id)
        )
      )
      .limit(1);

    if (!deck) {
      return NextResponse.json(
        { success: false, message: "Deck not found" },
        { status: 404 }
      );
    }

    // Fetch all cards for this deck
    const cards = await pgDb
      .select()
      .from(FlashcardSchema)
      .where(eq(FlashcardSchema.deckId, deckId))
      .orderBy(FlashcardSchema.createdAt);

    return NextResponse.json({ success: true, data: { ...deck, cards } });
  } catch (error) {
    console.error("GET /api/flashcards/decks/[deckId] error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
