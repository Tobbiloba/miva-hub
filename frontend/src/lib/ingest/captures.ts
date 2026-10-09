import "server-only";

import { and, desc, eq, isNull, notExists, sql } from "drizzle-orm";
import {
  indexCourseMaterial,
  removeMaterialChunks,
} from "lib/ai/rag/index-material";
import { pgDb } from "lib/db/pg/db.pg";
import {
  CourseMaterialSchema,
  CourseSchema,
  IngestionJobSchema,
} from "lib/db/pg/schema.pg";
import { claimQueuedJobs, processIngestionJob } from "./process-job";

/**
 * A student's captures as they experience them. A capture's real state is
 * spread over the ingestion job (videos/PDFs), the material's text
 * extraction, and its RAG indexing; this collapses them into one state the
 * student can act on.
 */

export type CaptureState =
  /** Being downloaded, read or indexed */
  | "processing"
  /** Askly can answer from it */
  | "ready"
  /** Captured, but there's no text to read (e.g. a video without captions) */
  | "no_text"
  /** A volunteer capture waiting for moderation before it's shared */
  | "in_review"
  /** Something went wrong; retryable */
  | "failed";

export type Capture = {
  /** "job:<id>" or "material:<id>" */
  key: string;
  title: string;
  contentType: string;
  course: { id: string; code: string; title: string };
  state: CaptureState;
  error: string | null;
  materialId: string | null;
  dueAt: Date | null;
  createdAt: Date;
  /** A private capture the student may remove (shared ones go to moderation) */
  own: boolean;
};

type Row = {
  jobStatus: string | null;
  jobError: string | null;
  transcriptStatus: string | null;
  transcriptError: string | null;
  ragIndexStatus: string | null;
  ragIndexError: string | null;
  ownerUserId: string | null;
  isPublished: boolean | null;
};

export function captureState(r: Row): {
  state: CaptureState;
  error: string | null;
} {
  if (r.jobStatus === "queued" || r.jobStatus === "downloading") {
    return { state: "processing", error: null };
  }
  if (r.jobStatus === "failed") return { state: "failed", error: r.jobError };
  switch (r.transcriptStatus) {
    case null:
    case "pending":
    case "extracting":
      return { state: "processing", error: null };
    case "failed":
      return { state: "failed", error: r.transcriptError };
    case "skipped":
      return { state: "no_text", error: r.transcriptError };
  }
  switch (r.ragIndexStatus) {
    case "indexed":
      return { state: "ready", error: null };
    case "empty":
      return { state: "no_text", error: "No readable text" };
    case "pending":
      return { state: "processing", error: null };
    case "failed":
      return { state: "failed", error: r.ragIndexError };
  }
  // Not indexable yet: shared captures wait for moderation
  if (!r.ownerUserId && !r.isPublished)
    return { state: "in_review", error: null };
  return { state: "failed", error: "Askly hasn't indexed this yet" };
}

const course = {
  id: CourseSchema.id,
  code: CourseSchema.courseCode,
  title: CourseSchema.title,
};

const materialState = {
  transcriptStatus: CourseMaterialSchema.transcriptStatus,
  transcriptError: CourseMaterialSchema.transcriptErrorMessage,
  ragIndexStatus: CourseMaterialSchema.ragIndexStatus,
  ragIndexError: CourseMaterialSchema.ragIndexError,
  ownerUserId: CourseMaterialSchema.ownerUserId,
  isPublished: CourseMaterialSchema.isPublished,
};

export async function listStudentCaptures(userId: string): Promise<Capture[]> {
  const [jobs, directMaterials] = await Promise.all([
    // Videos/PDFs go through a job; its material may not exist yet
    pgDb
      .select({
        id: IngestionJobSchema.id,
        title: IngestionJobSchema.lessonTitle,
        contentType: IngestionJobSchema.contentType,
        createdAt: IngestionJobSchema.createdAt,
        jobStatus: IngestionJobSchema.status,
        jobError: IngestionJobSchema.errorMessage,
        jobOwnerUserId: IngestionJobSchema.ownerUserId,
        materialId: CourseMaterialSchema.id,
        materialDeletedAt: CourseMaterialSchema.deletedAt,
        dueAt: CourseMaterialSchema.dueAt,
        course,
        ...materialState,
      })
      .from(IngestionJobSchema)
      .innerJoin(CourseSchema, eq(CourseSchema.id, IngestionJobSchema.courseId))
      .leftJoin(
        CourseMaterialSchema,
        eq(CourseMaterialSchema.id, IngestionJobSchema.courseMaterialId),
      )
      .where(eq(IngestionJobSchema.volunteerId, userId))
      .orderBy(desc(IngestionJobSchema.createdAt))
      .limit(200),
    // Quiz/assignment pages become materials directly, without a job
    pgDb
      .select({
        id: CourseMaterialSchema.id,
        title: CourseMaterialSchema.title,
        contentType: CourseMaterialSchema.materialType,
        createdAt: CourseMaterialSchema.createdAt,
        dueAt: CourseMaterialSchema.dueAt,
        course,
        ...materialState,
      })
      .from(CourseMaterialSchema)
      .innerJoin(
        CourseSchema,
        eq(CourseSchema.id, CourseMaterialSchema.courseId),
      )
      .where(
        and(
          eq(CourseMaterialSchema.volunteerId, userId),
          isNull(CourseMaterialSchema.deletedAt),
          notExists(
            pgDb
              .select({ one: sql`1` })
              .from(IngestionJobSchema)
              .where(
                eq(
                  IngestionJobSchema.courseMaterialId,
                  CourseMaterialSchema.id,
                ),
              ),
          ),
        ),
      )
      .orderBy(desc(CourseMaterialSchema.createdAt))
      .limit(200),
  ]);

  const captures: Capture[] = [
    ...jobs
      // A removed capture is gone for the student
      .filter((j) => !j.materialDeletedAt)
      .map((j) => ({
        key: `job:${j.id}`,
        title: j.title,
        contentType: j.contentType,
        course: j.course,
        materialId: j.materialId,
        dueAt: j.dueAt,
        createdAt: j.createdAt,
        own: j.jobOwnerUserId === userId,
        ...captureState(j),
      })),
    ...directMaterials.map((m) => ({
      key: `material:${m.id}`,
      title: m.title,
      contentType: m.contentType,
      course: m.course,
      materialId: m.id,
      dueAt: m.dueAt,
      createdAt: m.createdAt,
      own: m.ownerUserId === userId,
      ...captureState({ ...m, jobStatus: null, jobError: null }),
    })),
  ];
  return captures.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export class CaptureError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 404,
  ) {
    super(message);
  }
}

function parseKey(key: string): { kind: "job" | "material"; id: string } {
  const [kind, id] = key.split(":");
  if (
    (kind === "job" || kind === "material") &&
    /^[0-9a-f-]{36}$/i.test(id ?? "")
  ) {
    return { kind, id };
  }
  throw new CaptureError("Unknown capture", 404);
}

async function findCapture(userId: string, key: string): Promise<Capture> {
  const capture = (await listStudentCaptures(userId)).find(
    (c) => c.key === key,
  );
  if (!capture) throw new CaptureError("Unknown capture", 404);
  return capture;
}

/**
 * Retry a failed capture. Returns the work to run after the response
 * (processing can take longer than a request should wait).
 */
export async function retryCapture(
  userId: string,
  key: string,
): Promise<() => Promise<void>> {
  const { kind, id } = parseKey(key);
  const capture = await findCapture(userId, key);
  if (capture.state !== "failed") {
    throw new CaptureError("Only failed captures can be retried", 400);
  }

  // Text was read but indexing failed: index again
  const indexOnly =
    capture.materialId &&
    (await pgDb
      .select({ s: CourseMaterialSchema.transcriptStatus })
      .from(CourseMaterialSchema)
      .where(eq(CourseMaterialSchema.id, capture.materialId))
      .then(([m]) => m?.s === "extracted"));
  if (indexOnly || kind === "material") {
    const materialId = capture.materialId!;
    return async () => {
      await indexCourseMaterial(materialId).catch(() => {});
    };
  }

  // Requeue the job; a material from the first attempt is reused
  await pgDb
    .update(IngestionJobSchema)
    .set({ status: "queued", errorMessage: null, updatedAt: new Date() })
    .where(
      and(
        eq(IngestionJobSchema.id, id),
        eq(IngestionJobSchema.volunteerId, userId),
      ),
    );
  return async () => {
    for (const job of await claimQueuedJobs({ jobId: id }, 1)) {
      await processIngestionJob(job);
    }
  };
}

/**
 * Remove one of the student's own private captures: it stops grounding their
 * chat and disappears from their deadlines. Shared (volunteer) captures
 * belong to the course once submitted and are handled by moderation.
 */
export async function deleteCapture(
  userId: string,
  key: string,
): Promise<void> {
  const { kind, id } = parseKey(key);
  const capture = await findCapture(userId, key);

  if (capture.materialId) {
    const [material] = await pgDb
      .update(CourseMaterialSchema)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(CourseMaterialSchema.id, capture.materialId),
          eq(CourseMaterialSchema.ownerUserId, userId),
          isNull(CourseMaterialSchema.deletedAt),
        ),
      )
      .returning({ id: CourseMaterialSchema.id });
    if (!material) {
      throw new CaptureError(
        "Shared captures can't be removed here; ask your course admin",
        400,
      );
    }
    await removeMaterialChunks(material.id);
    return;
  }

  // A job that never produced a material (still queued, or failed early)
  const deleted =
    kind === "job"
      ? await pgDb
          .delete(IngestionJobSchema)
          .where(
            and(
              eq(IngestionJobSchema.id, id),
              eq(IngestionJobSchema.volunteerId, userId),
              eq(IngestionJobSchema.ownerUserId, userId),
            ),
          )
          .returning({ id: IngestionJobSchema.id })
      : [];
  if (deleted.length === 0) {
    throw new CaptureError(
      "Shared captures can't be removed here; ask your course admin",
      400,
    );
  }
}
