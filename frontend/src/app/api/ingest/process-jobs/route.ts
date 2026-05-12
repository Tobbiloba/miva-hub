import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { pgDb } from "@/lib/db/pg/db.pg";
import {
  UserSchema,
  IngestionJobSchema,
  CourseMaterialSchema,
  CourseSchema,
  DepartmentSchema,
} from "@/lib/db/pg/schema.pg";
import { eq, sql } from "drizzle-orm";
import { s3Service } from "@/lib/aws/s3-service";
import { headers } from "next/headers";
import { extractTranscriptForMaterial } from "@/lib/extraction/transcript-extractor";

/**
 * Process queued ingestion jobs.
 * Designed to be triggered by the extension after submitting, or by a cron later.
 * Idempotent — only picks up jobs in "queued" status.
 */
export async function POST(_request: NextRequest) {
  try {
    // Auth — require logged-in volunteer
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const [userRow] = await pgDb
      .select({ isVolunteer: UserSchema.isVolunteer })
      .from(UserSchema)
      .where(eq(UserSchema.id, session.user.id))
      .limit(1);

    if (!userRow?.isVolunteer) {
      return NextResponse.json(
        { error: "Volunteer access required" },
        { status: 403 }
      );
    }

    // Fetch queued jobs (limit to 5 per request to avoid timeouts)
    const queuedJobs = await pgDb
      .select()
      .from(IngestionJobSchema)
      .where(eq(IngestionJobSchema.status, "queued"))
      .orderBy(IngestionJobSchema.createdAt)
      .limit(5);

    if (queuedJobs.length === 0) {
      return NextResponse.json({ processed: 0, message: "No queued jobs" });
    }

    const results: Array<{
      job_id: string;
      status: string;
      error?: string;
    }> = [];

    for (const job of queuedJobs) {
      try {
        // Mark as downloading
        await pgDb
          .update(IngestionJobSchema)
          .set({ status: "downloading", updatedAt: new Date() })
          .where(eq(IngestionJobSchema.id, job.id));

        // Look up course details for S3 key generation
        const [course] = await pgDb
          .select({
            courseCode: CourseSchema.courseCode,
            departmentId: CourseSchema.departmentId,
          })
          .from(CourseSchema)
          .where(eq(CourseSchema.id, job.courseId))
          .limit(1);

        let deptCode = "UNKNOWN";
        if (course?.departmentId) {
          const [dept] = await pgDb
            .select({ code: DepartmentSchema.code })
            .from(DepartmentSchema)
            .where(eq(DepartmentSchema.id, course.departmentId))
            .limit(1);
          deptCode = dept?.code ?? "UNKNOWN";
        }

        const payload = job.payload as Record<string, any>;
        const slug = job.lessonTitle
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
        const weekStr = job.weekNumber
          ? `week-${String(job.weekNumber).padStart(2, "0")}`
          : "general";
        const sessionDir = job.sessionId ?? "no-session";

        if (job.contentType === "pdf") {
          // ── PDF download ──────────────────────────────────────
          const pdfUrl = payload.pdf_url;
          if (!pdfUrl) throw new Error("Missing pdf_url in payload");

          const pdfRes = await fetch(pdfUrl);
          if (!pdfRes.ok) {
            throw new Error(`PDF download failed: ${pdfRes.status} ${pdfRes.statusText}`);
          }

          const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
          const pdfFilename =
            payload.pdf_filename || `${slug}.pdf`;
          const s3Key = `materials/${sessionDir}/${job.courseId}/${weekStr}/${pdfFilename}`;

          // Upload to S3
          const s3Result = await s3Service.uploadFile(
            new File([pdfBuffer], pdfFilename, { type: "application/pdf" }),
            s3Key,
            { userId: job.volunteerId, userRole: "student" }
          );

          if (!s3Result.success) {
            throw new Error(`S3 upload failed: ${s3Result.error}`);
          }

          // Create course_material row (unpublished — moderation gate)
          const [material] = await pgDb
            .insert(CourseMaterialSchema)
            .values({
              courseId: job.courseId,
              materialType: "reading",
              title: job.lessonTitle,
              contentUrl: s3Key,
              publicUrl: s3Result.cloudFrontUrl || s3Result.s3Url,
              fileName: pdfFilename,
              fileSize: pdfBuffer.length,
              mimeType: "application/pdf",
              weekNumber: job.weekNumber,
              isPublic: false,
              isPublished: false,
              uploadedById: job.volunteerId,
              sessionId: job.sessionId,
              ingestionSource: "volunteer_extension",
              volunteerId: job.volunteerId,
            })
            .returning({ id: CourseMaterialSchema.id });

          // Mark job completed
          await pgDb
            .update(IngestionJobSchema)
            .set({
              status: "completed",
              courseMaterialId: material.id,
              completedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(IngestionJobSchema.id, job.id));

          // Extract text from PDF (inline, no separate queue for v1)
          const pdfExtraction = await extractTranscriptForMaterial(
            material.id,
            "application/pdf",
            { pdfBuffer }
          );
          console.log(
            `[ingest/process-jobs] PDF transcript extraction: ${pdfExtraction.status}` +
            (pdfExtraction.wordCount ? ` (${pdfExtraction.wordCount} words)` : "")
          );

          results.push({ job_id: job.id, status: "completed" });
        } else if (job.contentType === "video") {
          // ── Video download (yt-dlp stub) ──────────────────────
          // v1: scaffold the flow, log the command, mark completed with a stub material
          const vimeoId = payload.vimeo_video_id;
          const vimeoHash = payload.vimeo_hash || "";
          const vimeoUrl = vimeoHash
            ? `https://player.vimeo.com/video/${vimeoId}?h=${vimeoHash}`
            : `https://player.vimeo.com/video/${vimeoId}`;

          console.log(
            `[ingest/process-jobs] yt-dlp STUB — would download: yt-dlp "${vimeoUrl}" -o /tmp/${job.id}.mp4`
          );

          const s3Key = `materials/${sessionDir}/${job.courseId}/${weekStr}/${slug}.mp4`;

          // Create a placeholder course_material row (no actual file yet)
          const [material] = await pgDb
            .insert(CourseMaterialSchema)
            .values({
              courseId: job.courseId,
              materialType: "lecture",
              title: job.lessonTitle,
              description: `[PENDING VIDEO DOWNLOAD] Vimeo: ${vimeoUrl}`,
              contentUrl: s3Key,
              publicUrl: vimeoUrl, // temporary — will be S3 URL after actual download
              fileName: `${slug}.mp4`,
              mimeType: "video/mp4",
              weekNumber: job.weekNumber,
              isPublic: false,
              isPublished: false,
              uploadedById: job.volunteerId,
              sessionId: job.sessionId,
              ingestionSource: "volunteer_extension",
              volunteerId: job.volunteerId,
              vimeoVideoId: vimeoId || null,
              ytDlpStatus: "pending",
            })
            .returning({ id: CourseMaterialSchema.id });

          // Mark completed (stub — actual download deferred to v1.1)
          await pgDb
            .update(IngestionJobSchema)
            .set({
              status: "completed",
              courseMaterialId: material.id,
              completedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(IngestionJobSchema.id, job.id));

          // Extract VTT transcript from Vimeo (even though video bytes are stubbed)
          if (vimeoId) {
            const vttExtraction = await extractTranscriptForMaterial(
              material.id,
              "video/mp4",
              { vimeoVideoId: vimeoId, vimeoHash: vimeoHash || undefined }
            );
            console.log(
              `[ingest/process-jobs] Vimeo VTT extraction: ${vttExtraction.status}` +
              (vttExtraction.wordCount ? ` (${vttExtraction.wordCount} words)` : "")
            );
          }

          results.push({
            job_id: job.id,
            status: "completed",
            error: "Video download stubbed — yt-dlp not yet wired",
          });
        }
      } catch (error: any) {
        console.error(`[ingest/process-jobs] Job ${job.id} failed:`, error);

        await pgDb
          .update(IngestionJobSchema)
          .set({
            status: "failed",
            errorMessage: error.message || "Unknown error",
            updatedAt: new Date(),
          })
          .where(eq(IngestionJobSchema.id, job.id));

        results.push({
          job_id: job.id,
          status: "failed",
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      processed: results.length,
      results,
    });
  } catch (error) {
    console.error("[ingest/process-jobs] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
