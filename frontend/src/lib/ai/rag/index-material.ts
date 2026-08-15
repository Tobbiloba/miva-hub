import "server-only";

import { eq, sql } from "drizzle-orm";
import { pgDb } from "lib/db/pg/db.pg";
import { CourseMaterialSchema } from "lib/db/pg/schema.pg";
import { chunkText } from "./chunk";
import { embedTexts, toVectorLiteral } from "./embedding";

/**
 * (Re)index one course material into material_chunk: chunk its transcript,
 * embed each chunk, and replace any existing chunks for the material.
 * Returns the number of chunks written (0 if there's nothing to index).
 */
export async function indexCourseMaterial(materialId: string): Promise<number> {
  const [material] = await pgDb
    .select({
      id: CourseMaterialSchema.id,
      courseId: CourseMaterialSchema.courseId,
      title: CourseMaterialSchema.title,
      materialType: CourseMaterialSchema.materialType,
      weekNumber: CourseMaterialSchema.weekNumber,
      description: CourseMaterialSchema.description,
      transcriptText: CourseMaterialSchema.transcriptText,
    })
    .from(CourseMaterialSchema)
    .where(eq(CourseMaterialSchema.id, materialId))
    .limit(1);

  if (!material) return 0;

  const text = (material.transcriptText || material.description || "").trim();
  const chunks = chunkText(text);
  if (chunks.length === 0) {
    // Nothing to index — clear any stale chunks so retrieval stays accurate.
    await pgDb.execute(
      sql`DELETE FROM material_chunk WHERE material_id = ${materialId}`,
    );
    return 0;
  }

  const embeddings = await embedTexts(chunks);

  await pgDb.execute(
    sql`DELETE FROM material_chunk WHERE material_id = ${materialId}`,
  );

  for (let i = 0; i < chunks.length; i++) {
    await pgDb.execute(
      sql`INSERT INTO material_chunk
        (course_id, material_id, chunk_index, title, material_type, week_number, content, embedding)
        VALUES (
          ${material.courseId},
          ${materialId},
          ${i},
          ${material.title},
          ${material.materialType},
          ${material.weekNumber},
          ${chunks[i]},
          ${toVectorLiteral(embeddings[i])}::vector
        )`,
    );
  }

  return chunks.length;
}
