import "server-only";

import { s3Service } from "@/lib/aws/s3-service";
import { pgDb } from "@/lib/db/pg/db.pg";
import {
  CourseMaterialSchema,
  IngestionJobSchema,
} from "@/lib/db/pg/schema.pg";
import { extractTranscriptForMaterial } from "@/lib/extraction/transcript-extractor";
import { eq, inArray, sql } from "drizzle-orm";
import logger from "logger";
import {
  MAX_CAPTURE_PDF_BYTES,
  isAllowedPdfUrl,
  isOwnCaptureUploadKey,
  sanitizePdfFilename,
  slugify,
} from "./capture";

const MAX_PDF_BYTES = MAX_CAPTURE_PDF_BYTES;
const DOWNLOAD_TIMEOUT_MS = 30_000;
const MAX_REDIRECTS = 3;

type IngestionJob = typeof IngestionJobSchema.$inferSelect;

export type JobScope =
  | { jobId: string }
  | { volunteerId: string }
  | { universityId: string }
  | { all: true };

/**
 * A job still "downloading" after this long was abandoned (the function
 * running it timed out or crashed) and is claimed again.
 */
const STALE_JOB_MINUTES = 10;

/**
 * Atomically claim up to `limit` runnable jobs in `scope` (→ downloading):
 * queued ones, and abandoned ones stuck in "downloading". FOR UPDATE SKIP
 * LOCKED means concurrent processors never claim the same job.
 */
export async function claimQueuedJobs(
  scope: JobScope,
  limit = 5,
): Promise<IngestionJob[]> {
  const scopeFilter =
    "jobId" in scope
      ? sql`j.id = ${scope.jobId}`
      : "volunteerId" in scope
        ? sql`j.volunteer_id = ${scope.volunteerId}`
        : "universityId" in scope
          ? sql`c.university_id = ${scope.universityId}`
          : sql`TRUE`;

  const claimed = await pgDb.execute(sql`
    UPDATE ingestion_job SET status = 'downloading', updated_at = now()
    WHERE id IN (
      SELECT j.id FROM ingestion_job j
      JOIN course c ON c.id = j.course_id
      WHERE (
          j.status = 'queued'
          OR (j.status = 'downloading'
              AND j.updated_at < now() - make_interval(mins => ${STALE_JOB_MINUTES}))
        )
        AND ${scopeFilter}
      ORDER BY j.created_at
      LIMIT ${limit}
      FOR UPDATE OF j SKIP LOCKED
    )
    RETURNING id
  `);
  const ids = (claimed.rows as { id: string }[]).map((r) => r.id);
  if (ids.length === 0) return [];
  return pgDb
    .select()
    .from(IngestionJobSchema)
    .where(inArray(IngestionJobSchema.id, ids));
}

/**
 * Download a capture PDF without letting the URL reach anything but the LMS
 * asset hosts: every hop (including redirects) is checked against the
 * allowlist, with a timeout, a size cap, and a PDF signature check.
 */
export async function downloadCapturePdf(rawUrl: string): Promise<Buffer> {
  let url = rawUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (!isAllowedPdfUrl(url)) {
      throw new Error("PDF URL is not on an allowed host");
    }
    const res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
    });

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) throw new Error("PDF redirect without location");
      url = new URL(location, url).toString();
      continue;
    }
    if (!res.ok) {
      throw new Error(`PDF download failed: ${res.status} ${res.statusText}`);
    }

    const declared = Number(res.headers.get("content-length") ?? 0);
    if (declared > MAX_PDF_BYTES) throw new Error("PDF exceeds 50 MB limit");
    if (!res.body) throw new Error("PDF response has no body");

    const parts: Uint8Array[] = [];
    let total = 0;
    const reader = res.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_PDF_BYTES) {
        await reader.cancel();
        throw new Error("PDF exceeds 50 MB limit");
      }
      parts.push(value);
    }

    return assertPdf(Buffer.concat(parts));
  }
  throw new Error("Too many redirects downloading PDF");
}

function assertPdf(buffer: Buffer): Buffer {
  if (buffer.subarray(0, 5).toString("latin1") !== "%PDF-") {
    throw new Error("File is not a PDF");
  }
  return buffer;
}

/**
 * Bytes of a captured PDF: uploaded by the extension to S3 (the LMS CDN
 * refuses server-side downloads), or fetched from an allowlisted URL.
 */
async function loadCapturePdf(
  job: IngestionJob,
  payload: Record<string, any>,
): Promise<Buffer> {
  if (payload.upload_key) {
    if (!isOwnCaptureUploadKey(payload.upload_key, job.volunteerId)) {
      throw new Error("Upload key does not belong to this capture");
    }
    return assertPdf(
      await s3Service.getObjectBytes(payload.upload_key, MAX_PDF_BYTES),
    );
  }
  return downloadCapturePdf(payload.pdf_url);
}

/**
 * Process one claimed job end to end: file the capture as a course_material,
 * then extract its text. The job is "completed" only once the text was read
 * (or the source has none, e.g. a video without captions, which the material
 * records); an extraction failure fails the job so it can be retried. A retry
 * reuses the material the first attempt created.
 */
export async function processIngestionJob(job: IngestionJob): Promise<{
  job_id: string;
  status: "completed" | "failed";
  error?: string;
}> {
  try {
    const payload = job.payload as Record<string, any>;
    let extraction: Awaited<ReturnType<typeof extractTranscriptForMaterial>>;

    if (job.courseMaterialId) {
      extraction = await reextract(job, payload, job.courseMaterialId);
    } else if (job.contentType === "pdf") {
      const pdfBuffer = await loadCapturePdf(job, payload);
      const materialId = await filePdfMaterial(job, payload, pdfBuffer);
      extraction = await extractTranscriptForMaterial(
        materialId,
        "application/pdf",
        { pdfBuffer },
      );
    } else {
      const materialId = await fileVideoMaterial(job, payload);
      extraction = await extractTranscriptForMaterial(materialId, "video/mp4", {
        vimeoVideoId: String(payload.vimeo_video_id),
        vimeoHash: payload.vimeo_hash ? String(payload.vimeo_hash) : undefined,
      });
    }

    if (extraction.status === "failed") {
      throw new Error(
        `Couldn't read the text: ${extraction.error ?? "unknown error"}`,
      );
    }
    await markCompleted(job.id);
    return { job_id: job.id, status: "completed" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error(`[ingest] Job ${job.id} failed:`, error);
    await pgDb
      .update(IngestionJobSchema)
      .set({ status: "failed", errorMessage: message, updatedAt: new Date() })
      .where(eq(IngestionJobSchema.id, job.id));
    return { job_id: job.id, status: "failed", error: message };
  }
}

function materialBase(job: IngestionJob) {
  return {
    courseId: job.courseId,
    title: job.lessonTitle,
    weekNumber: job.weekNumber,
    isPublic: false,
    isPublished: false,
    uploadedById: job.volunteerId,
    sessionId: job.sessionId,
    ingestionSource: "volunteer_extension" as const,
    volunteerId: job.volunteerId,
    ownerUserId: job.ownerUserId,
  };
}

/** Upload the PDF to S3 and create its material; links it to the job. */
async function filePdfMaterial(
  job: IngestionJob,
  payload: Record<string, any>,
  pdfBuffer: Buffer,
): Promise<string> {
  const slug = slugify(job.lessonTitle);
  const weekStr = job.weekNumber
    ? `week-${String(job.weekNumber).padStart(2, "0")}`
    : "general";
  const sessionDir = job.sessionId ?? "no-session";
  // Private captures live under their owner so keys never collide/overwrite
  const keyPrefix = job.ownerUserId
    ? `materials/private/${job.ownerUserId}/${job.courseId}/${weekStr}`
    : `materials/${sessionDir}/${job.courseId}/${weekStr}`;
  const pdfFilename = sanitizePdfFilename(payload.pdf_filename, slug);
  const s3Key = `${keyPrefix}/${pdfFilename}`;

  const s3Result = await s3Service.uploadFile(
    new File([new Uint8Array(pdfBuffer)], pdfFilename, {
      type: "application/pdf",
    }),
    s3Key,
    { userId: job.volunteerId, userRole: "student" },
  );
  if (!s3Result.success) {
    throw new Error(`S3 upload failed: ${s3Result.error}`);
  }
  if (payload.upload_key) {
    // The temporary upload has been filed under the material's key
    await s3Service.deleteFile(payload.upload_key, {
      userId: job.volunteerId,
      userRole: "student",
    });
  }

  const [material] = await pgDb
    .insert(CourseMaterialSchema)
    .values({
      ...materialBase(job),
      materialType: "reading",
      contentUrl: s3Key,
      publicUrl: s3Result.cloudFrontUrl || s3Result.s3Url,
      fileName: pdfFilename,
      fileSize: pdfBuffer.length,
      mimeType: "application/pdf",
    })
    .returning({ id: CourseMaterialSchema.id });
  await linkMaterial(job.id, material.id);
  return material.id;
}

/**
 * Create a video's material. The transcript comes from Vimeo's captions; the
 * video file itself is not downloaded (yt-dlp is not wired up).
 */
async function fileVideoMaterial(
  job: IngestionJob,
  payload: Record<string, any>,
): Promise<string> {
  const vimeoId = String(payload.vimeo_video_id);
  const vimeoHash = payload.vimeo_hash ? String(payload.vimeo_hash) : "";
  const vimeoUrl = vimeoHash
    ? `https://player.vimeo.com/video/${vimeoId}?h=${vimeoHash}`
    : `https://player.vimeo.com/video/${vimeoId}`;

  const [material] = await pgDb
    .insert(CourseMaterialSchema)
    .values({
      ...materialBase(job),
      materialType: "lecture",
      description: `Vimeo lecture: ${vimeoUrl}`,
      publicUrl: vimeoUrl,
      fileName: `${slugify(job.lessonTitle)}.mp4`,
      mimeType: "video/mp4",
      vimeoVideoId: vimeoId,
      ytDlpStatus: "skipped",
    })
    .returning({ id: CourseMaterialSchema.id });
  await linkMaterial(job.id, material.id);
  return material.id;
}

/** Retry: extract again for the material a previous attempt created. */
async function reextract(
  job: IngestionJob,
  payload: Record<string, any>,
  materialId: string,
) {
  const [material] = await pgDb
    .select({
      contentUrl: CourseMaterialSchema.contentUrl,
      deletedAt: CourseMaterialSchema.deletedAt,
    })
    .from(CourseMaterialSchema)
    .where(eq(CourseMaterialSchema.id, materialId))
    .limit(1);
  if (!material || material.deletedAt) {
    throw new Error("This capture was removed");
  }
  if (job.contentType === "pdf") {
    if (!material.contentUrl) throw new Error("The captured PDF is missing");
    return extractTranscriptForMaterial(materialId, "application/pdf", {
      s3Key: material.contentUrl,
    });
  }
  return extractTranscriptForMaterial(materialId, "video/mp4", {
    vimeoVideoId: String(payload.vimeo_video_id),
    vimeoHash: payload.vimeo_hash ? String(payload.vimeo_hash) : undefined,
  });
}

async function linkMaterial(jobId: string, materialId: string) {
  await pgDb
    .update(IngestionJobSchema)
    .set({ courseMaterialId: materialId, updatedAt: new Date() })
    .where(eq(IngestionJobSchema.id, jobId));
}

async function markCompleted(jobId: string) {
  await pgDb
    .update(IngestionJobSchema)
    .set({
      status: "completed",
      errorMessage: null,
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(IngestionJobSchema.id, jobId));
}
