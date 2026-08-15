/**
 * Backfill RAG embeddings for published course materials into material_chunk.
 *
 * Chunks each material's transcript, embeds with OpenAI text-embedding-3-small,
 * and (re)writes its chunks. Idempotent per material.
 *
 * Run all:            npx tsx scripts/backfill-embeddings.ts
 * Run one course:     npx tsx scripts/backfill-embeddings.ts COS203
 *
 * Safety: refuses to run against a non-local database.
 */
import "load-env";

import { openai } from "@ai-sdk/openai";
import { embedMany } from "ai";
import { and, eq, isNull } from "drizzle-orm";
import { pgDb } from "lib/db/pg/db.pg";
import { sql } from "drizzle-orm";
import {
  CourseMaterialSchema,
  CourseSchema,
} from "lib/db/pg/schema.pg";
import { chunkText } from "lib/ai/rag/chunk";

const dbUrl = process.env.POSTGRES_URL ?? "";
if (!/localhost|127\.0\.0\.1/.test(dbUrl)) {
  console.error(
    `Refusing to run: POSTGRES_URL is not local (${dbUrl.replace(/:[^:@/]+@/, ":***@")}).`,
  );
  process.exit(1);
}

const EMBED_MODEL = "text-embedding-3-small";
const toVectorLiteral = (v: number[]) => `[${v.join(",")}]`;

async function main() {
  const courseFilter = process.argv[2]?.trim();

  const rows = await pgDb
    .select({
      id: CourseMaterialSchema.id,
      courseId: CourseMaterialSchema.courseId,
      title: CourseMaterialSchema.title,
      materialType: CourseMaterialSchema.materialType,
      weekNumber: CourseMaterialSchema.weekNumber,
      description: CourseMaterialSchema.description,
      transcriptText: CourseMaterialSchema.transcriptText,
      courseCode: CourseSchema.courseCode,
    })
    .from(CourseMaterialSchema)
    .innerJoin(CourseSchema, eq(CourseMaterialSchema.courseId, CourseSchema.id))
    .where(
      and(
        eq(CourseMaterialSchema.isPublished, true),
        isNull(CourseMaterialSchema.deletedAt),
      ),
    );

  const materials = courseFilter
    ? rows.filter((r) => r.courseCode === courseFilter)
    : rows;

  console.log(
    `Indexing ${materials.length} published material(s)${courseFilter ? ` for ${courseFilter}` : ""}...`,
  );

  let totalChunks = 0;
  let indexed = 0;
  for (const m of materials) {
    const text = (m.transcriptText || m.description || "").trim();
    const chunks = chunkText(text);
    if (chunks.length === 0) {
      console.log(`  · skip "${m.title}" (${m.courseCode}) — no text`);
      await pgDb.execute(
        sql`DELETE FROM material_chunk WHERE material_id = ${m.id}`,
      );
      continue;
    }

    const { embeddings } = await embedMany({
      model: openai.textEmbedding(EMBED_MODEL),
      values: chunks,
    });

    await pgDb.execute(
      sql`DELETE FROM material_chunk WHERE material_id = ${m.id}`,
    );
    for (let i = 0; i < chunks.length; i++) {
      await pgDb.execute(
        sql`INSERT INTO material_chunk
          (course_id, material_id, chunk_index, title, material_type, week_number, content, embedding)
          VALUES (${m.courseId}, ${m.id}, ${i}, ${m.title}, ${m.materialType}, ${m.weekNumber}, ${chunks[i]}, ${toVectorLiteral(embeddings[i])}::vector)`,
      );
    }
    totalChunks += chunks.length;
    indexed++;
    console.log(
      `  ✓ "${m.title}" (${m.courseCode}) — ${chunks.length} chunks`,
    );
  }

  console.log(
    `Done. Indexed ${indexed} material(s), ${totalChunks} chunks total.`,
  );
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
