import { getEnrolledCourse } from "@/lib/ai/course-tutor-context";
import { pgDb } from "@/lib/db/pg/db.pg";
import {
  AcademicSessionSchema,
  CourseMaterialSchema,
  CourseSchema,
  IngestionJobSchema,
  UserSchema,
} from "@/lib/db/pg/schema.pg";
import { getIngestUserId } from "@/lib/extension/token";
import {
  LessonCaptureSchema,
  escapeLike,
  isShareableCapture,
} from "@/lib/ingest/capture";
import { claimQueuedJobs, processIngestionJob } from "@/lib/ingest/process-job";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { and, eq, ilike, isNull, sql } from "drizzle-orm";
import logger from "logger";
import { NextRequest, NextResponse, after } from "next/server";

/**
 * POST /api/ingest/lesson — a lesson captured by the Askly Capture extension.
 *
 * Two modes, decided by the server from the caller's account:
 * - Volunteer: capture feeds the shared course corpus after admin approval
 *   (ownerUserId NULL, unpublished until moderated).
 * - Student: capture is PRIVATE to them (ownerUserId = student) and grounds
 *   their own chat as soon as it's processed. Shareable captures are also
 *   queued for moderation; approval moves them into the shared corpus.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Auth — extension bearer token or web session
    const userId = await getIngestUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    // Caps protect extraction/embedding spend: bursts and daily volume
    const burst = await checkRateLimit(`ingest:${userId}`, 30, 60 * 60);
    if (!burst.allowed) return rateLimitResponse(burst);
    const daily = await checkRateLimit(
      `ingest-day:${userId}`,
      150,
      24 * 60 * 60,
    );
    if (!daily.allowed) return rateLimitResponse(daily);

    const [userRow] = await pgDb
      .select({
        isVolunteer: UserSchema.isVolunteer,
        universityId: UserSchema.universityId,
      })
      .from(UserSchema)
      .where(eq(UserSchema.id, userId))
      .limit(1);

    if (!userRow?.universityId) {
      return NextResponse.json(
        { error: "Your account is not linked to a university" },
        { status: 403 },
      );
    }

    // 2. Parse and validate request body
    const parsed = LessonCaptureSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message ?? "Invalid capture",
          issues: parsed.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
        { status: 400 },
      );
    }
    const {
      source_url,
      course_code,
      week_number,
      lesson_title,
      session_label,
      content_type,
      vimeo_video_id,
      vimeo_hash,
      pdf_url,
      pdf_filename,
      quiz_questions,
      quiz_instructions,
      quiz_metadata,
      assignment_instructions,
      assignment_requirements,
      assignment_metadata,
    } = parsed.data;

    // 3. Look up course by course_code — scoped to the caller's university
    // (course codes like COS201 are only unique per tenant)
    const [course] = await pgDb
      .select({ id: CourseSchema.id })
      .from(CourseSchema)
      .where(
        and(
          eq(CourseSchema.courseCode, course_code.toUpperCase()),
          eq(CourseSchema.universityId, userRow.universityId),
        ),
      )
      .limit(1);

    if (!course) {
      return NextResponse.json(
        { error: `Course '${course_code}' not found` },
        { status: 404 },
      );
    }

    // Students capture privately, so they must be enrolled for it to be useful
    // (retrieval is enrollment-gated) and to keep captures within their courses.
    const isPrivate = !userRow.isVolunteer;
    if (isPrivate && !(await getEnrolledCourse(userId, course.id))) {
      return NextResponse.json(
        {
          error: `You're not enrolled in ${course_code.toUpperCase()} on Askly. Enroll first, then capture.`,
        },
        { status: 403 },
      );
    }
    const ownerUserId = isPrivate ? userId : null;
    const shareable = isPrivate
      ? isShareableCapture(content_type, source_url)
      : true;

    // 4. Resolve session_id from session_label (within the caller's university)
    let sessionId: string | null = null;
    if (session_label) {
      const [academicSession] = await pgDb
        .select({ id: AcademicSessionSchema.id })
        .from(AcademicSessionSchema)
        .where(
          and(
            eq(AcademicSessionSchema.universityId, userRow.universityId),
            ilike(
              AcademicSessionSchema.sessionName,
              `%${escapeLike(session_label)}%`,
            ),
          ),
        )
        .limit(1);
      sessionId = academicSession?.id ?? null;
    }

    // 5. Build payload based on content type
    const payload =
      content_type === "video"
        ? { vimeo_video_id, vimeo_hash: vimeo_hash || null }
        : { pdf_url, pdf_filename: pdf_filename || null };

    // 6. Duplicate detection
    const weekMatch =
      week_number != null
        ? eq(CourseMaterialSchema.weekNumber, week_number)
        : isNull(CourseMaterialSchema.weekNumber);

    const sessionMatch = sessionId
      ? eq(CourseMaterialSchema.sessionId, sessionId)
      : isNull(CourseMaterialSchema.sessionId);

    // Build match conditions: vimeo_video_id (videos), file_name (PDFs), or title (fallback)
    const contentMatch =
      content_type === "video" && vimeo_video_id
        ? eq(CourseMaterialSchema.vimeoVideoId, vimeo_video_id)
        : content_type === "pdf" && pdf_filename
          ? sql`lower(${CourseMaterialSchema.fileName}) = lower(${pdf_filename})`
          : sql`lower(trim(${CourseMaterialSchema.title})) = lower(trim(${lesson_title}))`;

    const sameLesson = and(
      eq(CourseMaterialSchema.courseId, course.id),
      weekMatch,
      sessionMatch,
      isNull(CourseMaterialSchema.deletedAt),
      contentMatch,
    );

    // Already in the shared, published corpus → every enrolled student has it
    const [publishedShared] = await pgDb
      .select({ id: CourseMaterialSchema.id })
      .from(CourseMaterialSchema)
      .where(
        and(
          sameLesson,
          isNull(CourseMaterialSchema.ownerUserId),
          eq(CourseMaterialSchema.isPublished, true),
        ),
      )
      .limit(1);
    if (publishedShared) {
      return NextResponse.json(
        {
          error:
            "This lesson is already in Askly's course library — your chat can already use it.",
          duplicate: true,
          existing_material_id: publishedShared.id,
        },
        { status: 409 },
      );
    }

    const [existingDup] = await pgDb
      .select({
        id: CourseMaterialSchema.id,
        volunteerId: CourseMaterialSchema.volunteerId,
      })
      .from(CourseMaterialSchema)
      .where(
        and(
          sameLesson,
          ownerUserId
            ? eq(CourseMaterialSchema.ownerUserId, ownerUserId)
            : isNull(CourseMaterialSchema.ownerUserId),
        ),
      )
      .limit(1);

    if (existingDup) {
      return NextResponse.json(
        {
          error: isPrivate
            ? "You already captured this lesson."
            : existingDup.volunteerId === userId
              ? "You already captured this lesson. It's pending admin review."
              : "This lesson is already in the moderation queue. Admin will review the existing capture.",
          duplicate: true,
          existing_material_id: existingDup.id,
        },
        { status: 409 },
      );
    }

    // 7. Quiz/assignment → create course_material directly (no background job needed)
    if (content_type === "quiz" || content_type === "assignment_external") {
      const transcriptText =
        content_type === "quiz"
          ? formatQuizTranscript(
              lesson_title,
              quiz_instructions ?? null,
              quiz_questions ?? null,
            )
          : formatAssignmentTranscript(
              lesson_title,
              assignment_instructions ?? null,
              assignment_requirements ?? null,
              assignment_metadata ?? null,
            );

      const wordCount = transcriptText.split(/\s+/).filter(Boolean).length;
      const extMeta: Record<string, any> =
        content_type === "quiz"
          ? { ...(quiz_metadata || {}) }
          : { ...(assignment_metadata || {}) };
      if (content_type === "quiz" && quiz_questions?.length) {
        extMeta.question_count = quiz_questions.length;
      }

      const [material] = await pgDb
        .insert(CourseMaterialSchema)
        .values({
          courseId: course.id,
          materialType:
            content_type === "quiz" ? "quiz" : "assignment_external",
          title: lesson_title,
          description:
            content_type === "quiz"
              ? quiz_instructions
              : assignment_instructions,
          mimeType: "text/plain",
          weekNumber: week_number ?? null,
          isPublic: false,
          isPublished: false,
          uploadedById: userId,
          sessionId,
          ingestionSource: "volunteer_extension",
          volunteerId: userId,
          ownerUserId,
          shareable,
          transcriptText,
          transcriptSource: "manual",
          transcriptExtractedAt: new Date(),
          transcriptWordCount: wordCount,
          transcriptStatus: "extracted",
          externalMetadata: extMeta,
        })
        .returning({ id: CourseMaterialSchema.id });

      // Private captures ground the student's chat right away
      if (ownerUserId) {
        after(async () => {
          const { indexCourseMaterial } = await import(
            "@/lib/ai/rag/index-material"
          );
          await indexCourseMaterial(material.id).catch(() => {});
        });
      }

      return NextResponse.json(
        {
          material_id: material.id,
          status: "captured",
          content_type,
          visibility: ownerUserId ? "private" : "pending_review",
          shareable,
        },
        { status: 201 },
      );
    }

    // 8. Video/PDF → queue a job and process it right after responding
    const [job] = await pgDb
      .insert(IngestionJobSchema)
      .values({
        volunteerId: userId,
        ownerUserId,
        sourceUrl: source_url,
        courseId: course.id,
        weekNumber: week_number ?? null,
        lessonTitle: lesson_title,
        sessionId,
        contentType: content_type,
        payload,
        status: "queued",
      })
      .returning({
        id: IngestionJobSchema.id,
        status: IngestionJobSchema.status,
      });

    after(async () => {
      const [claimed] = await claimQueuedJobs({ jobId: job.id }, 1);
      if (claimed) await processIngestionJob(claimed);
    });

    return NextResponse.json(
      {
        job_id: job.id,
        status: job.status,
        visibility: ownerUserId ? "private" : "pending_review",
        shareable,
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error("[ingest/lesson] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ── Transcript formatting helpers ────────────────────────────────

function formatQuizTranscript(
  title: string,
  instructions: string | null,
  questions: Array<{ text: string; options?: string[] }> | null,
): string {
  const parts: string[] = [`Quiz: ${title}`];

  if (instructions) {
    parts.push(`Instructions: ${instructions}`);
  }

  if (questions?.length) {
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      parts.push(`\nQuestion ${i + 1}: ${q.text}`);
      if (q.options?.length) {
        parts.push(`Options: ${q.options.join(", ")}`);
      }
    }
  }

  return parts.join("\n");
}

function formatAssignmentTranscript(
  title: string,
  instructions: string | null,
  requirements: string | null,
  metadata: Record<string, any> | null,
): string {
  const parts: string[] = [`Assignment: ${title}`];

  if (instructions) {
    parts.push(`\nInstructions: ${instructions}`);
  }

  if (requirements) {
    parts.push(`\nRequirements: ${requirements}`);
  }

  if (metadata?.due_date) {
    parts.push(`\nDue: ${metadata.due_date}`);
  }

  if (metadata?.max_grade) {
    parts.push(`Max Grade: ${metadata.max_grade}`);
  }

  if (metadata?.submission_types) {
    parts.push(`Submission Type: ${metadata.submission_types}`);
  }

  return parts.join("\n");
}
