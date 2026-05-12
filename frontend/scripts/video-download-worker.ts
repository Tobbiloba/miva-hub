/**
 * yt-dlp video download worker for Askly content ingestion.
 *
 * Processes video stubs created by the ingestion worker:
 * 1. Queries for pending video downloads (yt_dlp_status = 'pending')
 * 2. Spawns yt-dlp to download the MP4
 * 3. Uploads to S3
 * 4. Updates course_material with real file info
 * 5. Triggers VTT transcript extraction
 *
 * Usage: cd frontend && pnpm tsx scripts/video-download-worker.ts
 * Requires: yt-dlp installed (brew install yt-dlp)
 */

import "load-env";
import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import { pgDb } from "@/lib/db/pg/db.pg";
import {
  CourseMaterialSchema,
  IngestionJobSchema,
} from "@/lib/db/pg/schema.pg";
import { eq, and, isNull, sql } from "drizzle-orm";
import { s3Service } from "@/lib/aws/s3-service";
import { extractTranscriptForMaterial } from "@/lib/extraction/transcript-extractor";

const execFileAsync = promisify(execFile);

const MAX_JOBS = 5;
const YT_DLP_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes per video
const FILE_SIZE_WARNING_BYTES = 500 * 1024 * 1024; // 500 MB

// ── Preflight: check yt-dlp is installed ────────────────────────────

async function checkYtDlp(): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync("yt-dlp", ["--version"]);
    console.log(`yt-dlp version: ${stdout.trim()}`);
    return true;
  } catch {
    console.error(
      "yt-dlp not found. Install with:\n" +
        "  macOS:  brew install yt-dlp\n" +
        "  pip:    pip install yt-dlp\n" +
        "  Linux:  sudo apt install yt-dlp"
    );
    return false;
  }
}

// ── Query pending video downloads ───────────────────────────────────

interface PendingVideo {
  materialId: string;
  jobId: string;
  title: string;
  courseId: string;
  weekNumber: number | null;
  sessionId: string | null;
  vimeoVideoId: string;
  vimeoHash: string;
  contentUrl: string | null;
}

async function getPendingVideos(): Promise<PendingVideo[]> {
  const rows = await pgDb
    .select({
      materialId: CourseMaterialSchema.id,
      jobId: IngestionJobSchema.id,
      title: CourseMaterialSchema.title,
      courseId: CourseMaterialSchema.courseId,
      weekNumber: CourseMaterialSchema.weekNumber,
      sessionId: CourseMaterialSchema.sessionId,
      payload: IngestionJobSchema.payload,
      contentUrl: CourseMaterialSchema.contentUrl,
    })
    .from(CourseMaterialSchema)
    .innerJoin(
      IngestionJobSchema,
      eq(IngestionJobSchema.courseMaterialId, CourseMaterialSchema.id)
    )
    .where(
      and(
        eq(IngestionJobSchema.contentType, "video"),
        eq(IngestionJobSchema.status, "completed"),
        eq(CourseMaterialSchema.ytDlpStatus, "pending")
      )
    )
    .orderBy(CourseMaterialSchema.createdAt)
    .limit(MAX_JOBS);

  return rows.map((r) => ({
    materialId: r.materialId,
    jobId: r.jobId,
    title: r.title,
    courseId: r.courseId,
    weekNumber: r.weekNumber,
    sessionId: r.sessionId,
    vimeoVideoId: (r.payload as any)?.vimeo_video_id || "",
    vimeoHash: (r.payload as any)?.vimeo_hash || "",
    contentUrl: r.contentUrl,
  }));
}

// ── Download a single video via yt-dlp ──────────────────────────────

async function downloadVideo(
  vimeoUrl: string,
  outputPath: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { stderr } = await execFileAsync(
      "yt-dlp",
      [
        "-f", "bv*+ba/b",
        "--merge-output-format", "mp4",
        "--no-warnings",
        "-o", outputPath,
        vimeoUrl,
      ],
      { timeout: YT_DLP_TIMEOUT_MS }
    );

    if (stderr && stderr.trim()) {
      console.log(`  yt-dlp stderr: ${stderr.trim().slice(0, 200)}`);
    }

    if (!fs.existsSync(outputPath)) {
      return { success: false, error: "yt-dlp completed but output file not found" };
    }

    return { success: true };
  } catch (error: any) {
    const msg = error.stderr?.trim() || error.message || "Unknown yt-dlp error";
    return { success: false, error: msg.slice(0, 500) };
  }
}

// ── Process a single pending video ──────────────────────────────────

async function processVideo(video: PendingVideo): Promise<{
  status: "completed" | "failed";
  error?: string;
  fileSize?: number;
}> {
  const vimeoUrl = video.vimeoHash
    ? `https://player.vimeo.com/video/${video.vimeoVideoId}?h=${video.vimeoHash}`
    : `https://player.vimeo.com/video/${video.vimeoVideoId}`;

  const tmpPath = path.join("/tmp", `${video.jobId}.mp4`);

  // Mark as downloading
  await pgDb
    .update(CourseMaterialSchema)
    .set({ ytDlpStatus: "downloading", updatedAt: new Date() })
    .where(eq(CourseMaterialSchema.id, video.materialId));

  try {
    // Step 1: Download via yt-dlp
    console.log(`  Downloading from ${vimeoUrl}`);
    const dlResult = await downloadVideo(vimeoUrl, tmpPath);

    if (!dlResult.success) {
      throw new Error(`yt-dlp failed: ${dlResult.error}`);
    }

    // Step 2: Check file size
    const stat = fs.statSync(tmpPath);
    const fileSize = stat.size;
    console.log(`  Downloaded: ${(fileSize / (1024 * 1024)).toFixed(1)} MB`);

    if (fileSize > FILE_SIZE_WARNING_BYTES) {
      console.warn(`  WARNING: Video exceeds 500MB (${(fileSize / (1024 * 1024)).toFixed(0)} MB)`);
    }

    // Step 3: Build S3 key
    const slug = video.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const weekStr = video.weekNumber
      ? `week-${String(video.weekNumber).padStart(2, "0")}`
      : "general";
    const sessionDir = video.sessionId ?? "no-session";
    const s3Key = `materials/${sessionDir}/${video.courseId}/${weekStr}/${slug}.mp4`;

    // Step 4: Upload to S3
    console.log(`  Uploading to S3: ${s3Key}`);
    const fileBuffer = fs.readFileSync(tmpPath);
    const file = new File([fileBuffer], `${slug}.mp4`, { type: "video/mp4" });

    const uploadResult = await s3Service.uploadFile(file, s3Key, {
      userId: "system",
      userRole: "admin",
    });

    if (!uploadResult.success) {
      throw new Error(`S3 upload failed: ${uploadResult.error}`);
    }

    // Step 5: Update course_material with real file info
    await pgDb
      .update(CourseMaterialSchema)
      .set({
        contentUrl: s3Key,
        publicUrl: uploadResult.cloudFrontUrl || uploadResult.s3Url,
        fileSize: fileSize,
        mimeType: "video/mp4",
        description: null, // clear the "[PENDING VIDEO DOWNLOAD]" stub description
        ytDlpStatus: "completed",
        ytDlpErrorMessage: null,
        updatedAt: new Date(),
      })
      .where(eq(CourseMaterialSchema.id, video.materialId));

    console.log(`  S3 upload complete`);

    // Step 6: Trigger VTT transcript extraction
    console.log(`  Triggering VTT transcript extraction...`);
    const extractResult = await extractTranscriptForMaterial(
      video.materialId,
      "video/mp4",
      { vimeoVideoId: video.vimeoVideoId, vimeoHash: video.vimeoHash || undefined }
    );
    console.log(
      `  Transcript: ${extractResult.status}` +
        (extractResult.wordCount ? ` (${extractResult.wordCount} words)` : "") +
        (extractResult.error ? ` — ${extractResult.error}` : "")
    );

    return { status: "completed", fileSize };
  } catch (error: any) {
    console.error(`  FAILED: ${error.message}`);

    await pgDb
      .update(CourseMaterialSchema)
      .set({
        ytDlpStatus: "failed",
        ytDlpErrorMessage: error.message?.slice(0, 500) || "Unknown error",
        updatedAt: new Date(),
      })
      .where(eq(CourseMaterialSchema.id, video.materialId));

    return { status: "failed", error: error.message };
  } finally {
    // Cleanup tmp file
    try {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    } catch {}
  }
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  console.log("=== Askly Video Download Worker ===\n");

  // Preflight
  if (!(await checkYtDlp())) {
    process.exit(1);
  }

  // Query pending
  const pending = await getPendingVideos();
  console.log(`\nFound ${pending.length} pending video download(s).\n`);

  if (pending.length === 0) {
    console.log("Nothing to do. Exiting.");
    process.exit(0);
  }

  let completed = 0;
  let failed = 0;

  for (let i = 0; i < pending.length; i++) {
    const video = pending[i];
    console.log(
      `[${i + 1}/${pending.length}] "${video.title}" (Vimeo: ${video.vimeoVideoId})`
    );

    const result = await processVideo(video);

    if (result.status === "completed") {
      completed++;
      console.log(
        `  DONE: ${(result.fileSize! / (1024 * 1024)).toFixed(1)} MB uploaded\n`
      );
    } else {
      failed++;
      console.log(`  FAILED: ${result.error}\n`);
    }
  }

  console.log("=== Summary ===");
  console.log(`Total:     ${pending.length}`);
  console.log(`Completed: ${completed}`);
  console.log(`Failed:    ${failed}`);

  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
