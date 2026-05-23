import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { pgDb } from "@/lib/db/pg/db.pg";
import {
  FlashcardDeckSchema,
  FlashcardSchema,
} from "@/lib/db/pg/schema.pg";
import { eq, and, lte, isNull, or, asc, sql } from "drizzle-orm";

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

    // Verify deck ownership
    const [deck] = await pgDb
      .select({ id: FlashcardDeckSchema.id })
      .from(FlashcardDeckSchema)
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

    // Get cards where next_due_at <= now (or null = never reviewed)
    const dueCards = await pgDb
      .select()
      .from(FlashcardSchema)
      .where(
        and(
          eq(FlashcardSchema.deckId, deckId),
          or(
            isNull(FlashcardSchema.nextDueAt),
            lte(FlashcardSchema.nextDueAt, sql`CURRENT_TIMESTAMP`)
          )
        )
      )
      .orderBy(asc(FlashcardSchema.nextDueAt));

    return NextResponse.json({ success: true, data: dueCards });
  } catch (error) {
    console.error("GET /api/flashcards/decks/[deckId]/due error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
