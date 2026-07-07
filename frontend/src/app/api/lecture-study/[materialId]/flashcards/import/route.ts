import { and, eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { loadLectureStudy } from "@/lib/academic/lecture-study";
import { getSession } from "@/lib/auth/server";
import { pgDb } from "lib/db/pg/db.pg";
import { FlashcardDeckSchema, FlashcardSchema } from "lib/db/pg/schema.pg";
import globalLogger from "logger";

const logger = globalLogger.withDefaults({
  message: "Lecture Flashcard Import API: ",
});

/**
 * POST /api/lecture-study/[materialId]/flashcards/import — copy the
 * AI-generated lecture flashcards into the student's own spaced-repetition
 * deck. Idempotent per student+material (returns the existing deck).
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ materialId: string }> },
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { materialId } = await params;
    const access = await loadLectureStudy(materialId, session.user.id);
    if (!access.allowed) {
      return NextResponse.json(
        { error: access.status === 404 ? "Not found" : "Forbidden" },
        { status: access.status },
      );
    }

    const { material, kit } = access.record;
    const cards: { front: string; back: string }[] =
      kit?.processingMetadata?.flashcards ?? [];
    if (cards.length === 0) {
      return NextResponse.json(
        { error: "No AI flashcards exist for this lecture yet" },
        { status: 404 },
      );
    }

    // Idempotency: one imported deck per student per lecture material
    const [existing] = await pgDb
      .select({ id: FlashcardDeckSchema.id })
      .from(FlashcardDeckSchema)
      .where(
        and(
          eq(FlashcardDeckSchema.studentId, session.user.id),
          sql`${FlashcardDeckSchema.sourceMaterialIds} @> ${JSON.stringify([materialId])}::jsonb`,
        ),
      )
      .limit(1);
    if (existing) {
      return NextResponse.json({
        success: true,
        deckId: existing.id,
        alreadyImported: true,
      });
    }

    const weekLabel = material.weekNumber ? ` Wk${material.weekNumber}` : "";
    const [deck] = await pgDb
      .insert(FlashcardDeckSchema)
      .values({
        studentId: session.user.id,
        courseId: material.courseId,
        weekNumber: material.weekNumber,
        title: `${material.courseCode}${weekLabel} — ${material.title}`,
        sourceMaterialIds: [materialId],
        cardCount: cards.length,
      })
      .returning({ id: FlashcardDeckSchema.id });

    await pgDb.insert(FlashcardSchema).values(
      cards.map((card) => ({
        deckId: deck.id,
        front: card.front,
        back: card.back,
      })),
    );

    return NextResponse.json(
      {
        success: true,
        deckId: deck.id,
        cardCount: cards.length,
        alreadyImported: false,
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error("import failed", error);
    return NextResponse.json(
      { error: "Failed to import flashcards" },
      { status: 500 },
    );
  }
}
