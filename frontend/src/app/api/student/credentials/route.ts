import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getEnrolledCourse } from "@/lib/ai/course-tutor-context";
import { issueCredential } from "@/lib/ai/credential";
import { getSession } from "auth/server";
import { pgDb } from "lib/db/pg/db.pg";
import { CourseSchema, MicroCredentialSchema } from "lib/db/pg/schema.pg";
import { checkRateLimit, rateLimitResponse } from "lib/rate-limit";
import globalLogger from "logger";

const logger = globalLogger.withDefaults({ message: "Credentials API: " });

export const maxDuration = 60;

/** GET /api/student/credentials — the student's issued micro-credentials. */
export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rows = await pgDb
      .select({
        id: MicroCredentialSchema.id,
        title: MicroCredentialSchema.title,
        summary: MicroCredentialSchema.summary,
        overallLevel: MicroCredentialSchema.overallLevel,
        competencies: MicroCredentialSchema.competencies,
        verificationCode: MicroCredentialSchema.verificationCode,
        status: MicroCredentialSchema.status,
        issuedAt: MicroCredentialSchema.issuedAt,
        courseCode: CourseSchema.courseCode,
        courseId: CourseSchema.id,
      })
      .from(MicroCredentialSchema)
      .innerJoin(
        CourseSchema,
        eq(MicroCredentialSchema.courseId, CourseSchema.id),
      )
      .where(eq(MicroCredentialSchema.studentId, session.user.id));

    return NextResponse.json({ credentials: rows });
  } catch (error) {
    logger.error("failed to list credentials", error);
    return NextResponse.json(
      { error: "Failed to load credentials" },
      { status: 500 },
    );
  }
}

const bodySchema = z.object({ courseId: z.string().uuid() });

/**
 * POST /api/student/credentials — request a micro-credential for a course.
 * Requires enrollment and real graded evidence; immutable once issued.
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "courseId is required" },
        { status: 400 },
      );
    }

    const rateLimit = checkRateLimit(`credential:${session.user.id}`, 3, 3600);
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

    // Enrollment gate — identity from the session, never the body
    const course = await getEnrolledCourse(
      session.user.id,
      parsed.data.courseId,
    );
    if (!course) {
      return NextResponse.json(
        { error: "Course not found or you are not enrolled in it" },
        { status: 403 },
      );
    }

    const result = await issueCredential(
      session.user.id,
      session.user.name || "Student",
      course,
    );
    if (result.status === "insufficient_evidence") {
      return NextResponse.json(
        {
          error:
            "Not enough graded evidence yet — complete a graded assignment or a viva session first",
        },
        { status: 422 },
      );
    }

    return NextResponse.json({
      status: result.status,
      credential: {
        id: result.credential.id,
        title: result.credential.title,
        summary: result.credential.summary,
        overallLevel: result.credential.overallLevel,
        competencies: result.credential.competencies,
        verificationCode: result.credential.verificationCode,
        issuedAt: result.credential.issuedAt,
      },
    });
  } catch (error) {
    logger.error("failed to issue credential", error);
    return NextResponse.json(
      { error: "Failed to issue credential" },
      { status: 500 },
    );
  }
}
