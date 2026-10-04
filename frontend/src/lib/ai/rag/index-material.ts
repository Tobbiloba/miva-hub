import "server-only";

import { eq } from "drizzle-orm";
import { pgDb } from "lib/db/pg/db.pg";
import { CourseMaterialSchema, MaterialChunkSchema } from "lib/db/pg/schema.pg";
import logger from "logger";
import { chunkText } from "./chunk";
import { embedTexts } from "./embedding";

/**
 * Whether a material may ground chat at all: shared material once published,
 * private (student-owned) material immediately. Deleted material never.
 */
export function isIndexable(material: {
  ownerUserId: string | null;
  isPublished: boolean;
  deletedAt: Date | null;
}): boolean {
  if (material.deletedAt) return false;
  return !!material.ownerUserId || material.isPublished;
}

/** Remove a material's chunks so it can no longer be retrieved. */
export async function removeMaterialChunks(materialId: string): Promise<void> {
  await pgDb
    .delete(MaterialChunkSchema)
    .where(eq(MaterialChunkSchema.materialId, materialId));
}

/**
 * (Re)index one course material into material_chunk: chunk its transcript,
 * embed each chunk, and atomically replace any existing chunks. Chunks carry
 * the material's owner so private captures only ground their owner's chat.
 * Records the outcome in course_material.rag_index_status; failures are
 * recorded and rethrown (the backfill script retries "failed" rows).
 * Returns the number of chunks written.
 */
export async function indexCourseMaterial(materialId: string): Promise<number> {
  const [material] = await pgDb
    .select({
      id: CourseMaterialSchema.id,
      courseId: CourseMaterialSchema.courseId,
      ownerUserId: CourseMaterialSchema.ownerUserId,
      isPublished: CourseMaterialSchema.isPublished,
      deletedAt: CourseMaterialSchema.deletedAt,
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

  if (!isIndexable(material)) {
    await removeMaterialChunks(materialId);
    await setIndexStatus(materialId, null);
    return 0;
  }

  const text = (material.transcriptText || material.description || "").trim();
  const chunks = chunkText(text);
  if (chunks.length === 0) {
    await removeMaterialChunks(materialId);
    await setIndexStatus(materialId, "empty");
    return 0;
  }

  try {
    await setIndexStatus(materialId, "pending");
    const embeddings = await embedTexts(chunks);

    await pgDb.transaction(async (tx) => {
      await tx
        .delete(MaterialChunkSchema)
        .where(eq(MaterialChunkSchema.materialId, materialId));
      await tx.insert(MaterialChunkSchema).values(
        chunks.map((content, i) => ({
          courseId: material.courseId,
          materialId,
          ownerUserId: material.ownerUserId,
          chunkIndex: i,
          title: material.title,
          materialType: material.materialType,
          weekNumber: material.weekNumber,
          content,
          embedding: embeddings[i],
        })),
      );
      await tx
        .update(CourseMaterialSchema)
        .set({
          ragIndexStatus: "indexed",
          ragIndexedAt: new Date(),
          ragIndexError: null,
        })
        .where(eq(CourseMaterialSchema.id, materialId));
    });

    return chunks.length;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`RAG indexing failed for material ${materialId}:`, error);
    await setIndexStatus(materialId, "failed", message.slice(0, 1000));
    throw error;
  }
}

async function setIndexStatus(
  materialId: string,
  status: "pending" | "indexed" | "failed" | "empty" | null,
  error: string | null = null,
) {
  await pgDb
    .update(CourseMaterialSchema)
    .set({ ragIndexStatus: status, ragIndexError: error })
    .where(eq(CourseMaterialSchema.id, materialId));
}
