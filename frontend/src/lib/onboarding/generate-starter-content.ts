/**
 * Fire-and-forget starter content generation for new signups.
 * Creates one flashcard deck (5 cards) from the student's first enrolled course.
 * Never throws — all errors are logged and swallowed.
 */

import { pgDb } from "@/lib/db/pg/db.pg";
import {
  FlashcardDeckSchema,
  FlashcardSchema,
  CourseSchema,
  CourseMaterialSchema,
  StudentEnrollmentSchema,
} from "@/lib/db/pg/schema.pg";
import { eq, and, asc, isNotNull, sql } from "drizzle-orm";

const CARD_COUNT = 5;

export function generateStarterContent(studentId: string) {
  // Fire-and-forget: run in background, never block caller
  doGenerate(studentId).catch((err) => {
    console.warn("starter_content: unexpected error:", err);
  });
}

async function doGenerate(studentId: string) {
  // Idempotency: skip if student already has any flashcard decks
  const [existingDeck] = await pgDb
    .select({ id: FlashcardDeckSchema.id })
    .from(FlashcardDeckSchema)
    .where(eq(FlashcardDeckSchema.studentId, studentId))
    .limit(1);

  if (existingDeck) {
    console.log(`starter_content: skipped, student ${studentId} already has decks`);
    return;
  }

  // Get student's first enrolled course (lowest course_code alphabetically)
  const [enrollment] = await pgDb
    .select({
      courseId: CourseSchema.id,
      courseCode: CourseSchema.courseCode,
      courseTitle: CourseSchema.title,
    })
    .from(StudentEnrollmentSchema)
    .innerJoin(CourseSchema, eq(StudentEnrollmentSchema.courseId, CourseSchema.id))
    .where(eq(StudentEnrollmentSchema.studentId, studentId))
    .orderBy(asc(CourseSchema.courseCode))
    .limit(1);

  if (!enrollment) {
    console.log(`starter_content: skipped, student ${studentId} has no enrolled courses`);
    return;
  }

  // Fetch week 1 content with extracted transcripts
  const materials = await pgDb
    .select({
      id: CourseMaterialSchema.id,
      title: CourseMaterialSchema.title,
      materialType: CourseMaterialSchema.materialType,
      weekNumber: CourseMaterialSchema.weekNumber,
      transcriptText: CourseMaterialSchema.transcriptText,
    })
    .from(CourseMaterialSchema)
    .where(
      and(
        eq(CourseMaterialSchema.courseId, enrollment.courseId),
        eq(CourseMaterialSchema.isPublished, true),
        eq(CourseMaterialSchema.transcriptStatus, "extracted"),
        isNotNull(CourseMaterialSchema.transcriptText),
        sql`${CourseMaterialSchema.deletedAt} IS NULL`,
        eq(CourseMaterialSchema.weekNumber, 1),
      ),
    )
    .limit(5);

  // If no week 1 content, try any week
  let contentRows = materials;
  if (contentRows.length === 0) {
    contentRows = await pgDb
      .select({
        id: CourseMaterialSchema.id,
        title: CourseMaterialSchema.title,
        materialType: CourseMaterialSchema.materialType,
        weekNumber: CourseMaterialSchema.weekNumber,
        transcriptText: CourseMaterialSchema.transcriptText,
      })
      .from(CourseMaterialSchema)
      .where(
        and(
          eq(CourseMaterialSchema.courseId, enrollment.courseId),
          eq(CourseMaterialSchema.isPublished, true),
          eq(CourseMaterialSchema.transcriptStatus, "extracted"),
          isNotNull(CourseMaterialSchema.transcriptText),
          sql`${CourseMaterialSchema.deletedAt} IS NULL`,
        ),
      )
      .orderBy(asc(CourseMaterialSchema.weekNumber))
      .limit(5);
  }

  if (contentRows.length === 0) {
    console.log(
      `starter_content: skipped, no captured content for ${enrollment.courseCode} (student ${studentId})`,
    );
    return;
  }

  // Build context from transcripts (cap at 3000 chars)
  let totalChars = 0;
  const contextParts: string[] = [];
  const sourceIds: string[] = [];
  const weekNumber = contentRows[0].weekNumber;

  for (const row of contentRows) {
    const text = row.transcriptText || "";
    const remaining = 3000 - totalChars;
    if (remaining <= 0) break;
    const snippet = text.slice(0, remaining);
    contextParts.push(
      `--- ${row.title} (Week ${row.weekNumber}, ${row.materialType}) ---\n${snippet}`,
    );
    sourceIds.push(row.id);
    totalChars += snippet.length;
  }

  const contextText = contextParts.join("\n\n");

  // Call LLM to generate flashcards
  const { generateText } = await import("ai");
  const { createOpenAI } = await import("@ai-sdk/openai");

  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const prompt = `You are a university flashcard generator. Using the course material below, create exactly ${CARD_COUNT} flashcards.

Course material:
${contextText}

Return ONLY a valid JSON array (no markdown, no explanation) where each element is {"front": "<question or prompt>", "back": "<concise answer>"}.
The front should test a key concept, definition, or application.
The back should be a clear, concise answer.`;

  const { text } = await generateText({
    model: openai("gpt-4o-mini"),
    prompt,
    maxOutputTokens: 1000,
  });

  // Parse cards
  let raw = text.trim();
  if (raw.startsWith("```")) {
    raw = raw.split("\n").slice(1).join("\n");
    if (raw.endsWith("```")) raw = raw.slice(0, -3).trim();
  }

  let cards: { front: string; back: string }[];
  try {
    cards = JSON.parse(raw);
  } catch {
    console.warn(`starter_content: failed to parse LLM response for ${enrollment.courseCode}`);
    return;
  }

  if (!Array.isArray(cards) || cards.length === 0) {
    console.warn(`starter_content: LLM returned no valid cards for ${enrollment.courseCode}`);
    return;
  }

  // Validate and cap
  const validated = cards
    .filter((c) => c && typeof c.front === "string" && typeof c.back === "string")
    .slice(0, CARD_COUNT);

  if (validated.length === 0) {
    console.warn(`starter_content: no valid front/back cards for ${enrollment.courseCode}`);
    return;
  }

  // Persist deck + cards
  const weekLabel = weekNumber ? ` Week ${weekNumber}` : "";
  const title = `${enrollment.courseCode}${weekLabel} — Starter Flashcards`;

  const [deck] = await pgDb
    .insert(FlashcardDeckSchema)
    .values({
      studentId,
      courseId: enrollment.courseId,
      weekNumber,
      title,
      sourceMaterialIds: sourceIds,
      cardCount: validated.length,
    })
    .returning({ id: FlashcardDeckSchema.id });

  if (!deck) {
    console.warn(`starter_content: failed to insert deck for ${enrollment.courseCode}`);
    return;
  }

  await pgDb.insert(FlashcardSchema).values(
    validated.map((card) => ({
      deckId: deck.id,
      front: card.front,
      back: card.back,
    })),
  );

  console.log(
    `starter_content: generated ${validated.length} flashcards for student ${studentId} course ${enrollment.courseCode} week ${weekNumber ?? "all"}`,
  );
}
