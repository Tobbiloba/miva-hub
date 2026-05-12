import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { pgDb } from "@/lib/db/pg/db.pg";
import {
  UserSchema,
  CourseSchema,
  AcademicSessionSchema,
  IngestionJobSchema,
  CourseMaterialSchema,
} from "@/lib/db/pg/schema.pg";
import { eq, and, or, isNull, ilike, sql } from "drizzle-orm";
import { headers } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    // 1. Auth — require logged-in volunteer
    // Use auth.api.getSession directly to avoid redirect() in API routes
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
        { error: "Volunteer access required. Contact admin to enable volunteer status." },
        { status: 403 }
      );
    }

    // 2. Parse and validate request body
    const body = await request.json();
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
    } = body;

    if (!source_url || !course_code || !lesson_title || !content_type) {
      return NextResponse.json(
        { error: "Missing required fields: source_url, course_code, lesson_title, content_type" },
        { status: 400 }
      );
    }

    if (!["video", "pdf"].includes(content_type)) {
      return NextResponse.json(
        { error: "content_type must be 'video' or 'pdf'" },
        { status: 400 }
      );
    }

    if (content_type === "video" && !vimeo_video_id) {
      return NextResponse.json(
        { error: "vimeo_video_id is required for video content" },
        { status: 400 }
      );
    }

    if (content_type === "pdf" && !pdf_url) {
      return NextResponse.json(
        { error: "pdf_url is required for PDF content" },
        { status: 400 }
      );
    }

    // 3. Look up course by course_code
    const [course] = await pgDb
      .select({ id: CourseSchema.id })
      .from(CourseSchema)
      .where(eq(CourseSchema.courseCode, course_code.toUpperCase()))
      .limit(1);

    if (!course) {
      return NextResponse.json(
        { error: `Course '${course_code}' not found` },
        { status: 404 }
      );
    }

    // 4. Resolve session_id from session_label
    let sessionId: string | null = null;
    if (session_label) {
      const [academicSession] = await pgDb
        .select({ id: AcademicSessionSchema.id })
        .from(AcademicSessionSchema)
        .where(ilike(AcademicSessionSchema.sessionName, `%${session_label}%`))
        .limit(1);
      sessionId = academicSession?.id ?? null;
    }

    // 5. Build payload based on content type
    const payload =
      content_type === "video"
        ? { vimeo_video_id, vimeo_hash: vimeo_hash || null }
        : { pdf_url, pdf_filename: pdf_filename || null };

    // 6. Duplicate detection — check for existing course_material matching this capture
    const weekMatch = week_number != null
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

    const [existingDup] = await pgDb
      .select({
        id: CourseMaterialSchema.id,
        isPublished: CourseMaterialSchema.isPublished,
        volunteerId: CourseMaterialSchema.volunteerId,
      })
      .from(CourseMaterialSchema)
      .where(
        and(
          eq(CourseMaterialSchema.courseId, course.id),
          weekMatch,
          sessionMatch,
          isNull(CourseMaterialSchema.deletedAt),
          contentMatch
        )
      )
      .limit(1);

    if (existingDup) {
      if (existingDup.isPublished) {
        return NextResponse.json(
          {
            error: "This lesson has already been added by another volunteer and approved. No action needed.",
            duplicate: true,
            existing_material_id: existingDup.id,
          },
          { status: 409 }
        );
      }

      if (existingDup.volunteerId === session.user.id) {
        return NextResponse.json(
          {
            error: "You already captured this lesson. It's pending admin review.",
            duplicate: true,
            existing_material_id: existingDup.id,
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        {
          error: "This lesson is already in the moderation queue. Admin will review the existing capture.",
          duplicate: true,
          existing_material_id: existingDup.id,
        },
        { status: 409 }
      );
    }

    // 7. Insert ingestion job
    const [job] = await pgDb
      .insert(IngestionJobSchema)
      .values({
        volunteerId: session.user.id,
        sourceUrl: source_url,
        courseId: course.id,
        weekNumber: week_number ?? null,
        lessonTitle: lesson_title,
        sessionId,
        contentType: content_type,
        payload,
        status: "queued",
      })
      .returning({ id: IngestionJobSchema.id, status: IngestionJobSchema.status });

    return NextResponse.json(
      { job_id: job.id, status: job.status },
      { status: 201 }
    );
  } catch (error) {
    console.error("[ingest/lesson] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
