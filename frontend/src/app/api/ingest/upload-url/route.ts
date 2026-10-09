import { paymentRequiredResponse } from "@/lib/billing/access";
import { checkCaptureAccess } from "@/lib/ingest/access";
import { getEnrolledCourse } from "@/lib/ai/course-tutor-context";
import { s3Service } from "@/lib/aws/s3-service";
import { pgDb } from "@/lib/db/pg/db.pg";
import { CourseSchema, UserSchema } from "@/lib/db/pg/schema.pg";
import { getIngestUserId } from "@/lib/extension/token";
import {
  MAX_CAPTURE_PDF_BYTES,
  newCaptureUploadKey,
} from "@/lib/ingest/capture";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { and, eq } from "drizzle-orm";
import logger from "logger";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const UploadUrlSchema = z.object({
  course_code: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2,6}\s?\d{2,4}[A-Za-z]?$/, "Invalid course code"),
  filename: z.string().trim().min(1).max(255),
  size: z.number().int().positive().max(MAX_CAPTURE_PDF_BYTES),
});

/**
 * POST /api/ingest/upload-url — presigned S3 PUT for a captured PDF.
 *
 * The LMS asset CDN refuses server-side downloads, so the extension fetches
 * the PDF with the student's own LMS session and uploads it here first; the
 * returned upload_key is then passed to /api/ingest/lesson. Same gates as a
 * capture: authenticated, same-university course, enrolled (students).
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getIngestUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const access = await checkCaptureAccess(userId);
    if (!access.allowed) return paymentRequiredResponse(access.reason);

    const limit = await checkRateLimit(`ingest-upload:${userId}`, 30, 60 * 60);
    if (!limit.allowed) return rateLimitResponse(limit);

    const parsed = UploadUrlSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.path[0] === "size"
              ? "PDF must be 50 MB or smaller"
              : (parsed.error.issues[0]?.message ?? "Invalid request"),
        },
        { status: 400 },
      );
    }
    const { course_code, filename, size } = parsed.data;

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
    if (!userRow.isVolunteer && !(await getEnrolledCourse(userId, course.id))) {
      return NextResponse.json(
        {
          error: `You're not enrolled in ${course_code.toUpperCase()} on Askly. Enroll first, then capture.`,
        },
        { status: 403 },
      );
    }

    const uploadKey = newCaptureUploadKey(userId, filename);
    const uploadUrl = await s3Service.generatePdfUploadUrl(uploadKey, size);

    return NextResponse.json({
      upload_url: uploadUrl,
      upload_key: uploadKey,
      // Signed headers the PUT must carry verbatim
      headers: {
        "Content-Type": "application/pdf",
        "x-amz-server-side-encryption": "AES256",
      },
      expires_in: 600,
    });
  } catch (error) {
    logger.error("[ingest/upload-url] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
