import { safeEqual } from "@/lib/auth/signatures";
import { pgDb } from "@/lib/db/pg/db.pg";
import { UserSchema } from "@/lib/db/pg/schema.pg";
import { recordActivity } from "@/lib/progress/record-activity";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Internal endpoint for MCP server to record study activity events.
 * Authenticated via a shared secret header (INTERNAL_API_SECRET), not user
 * session. Fails closed when the secret isn't configured.
 */
export async function POST(request: NextRequest) {
  try {
    const internalSecret = process.env.INTERNAL_API_SECRET;
    if (!internalSecret) {
      console.error("POST /api/internal/activity: INTERNAL_API_SECRET not set");
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }
    if (!safeEqual(request.headers.get("x-internal-secret"), internalSecret)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const {
      studentId,
      activityType,
      courseId,
      weekNumber,
      entityId,
      entityMetadata,
    } = body;

    if (!studentId || !activityType) {
      return NextResponse.json(
        { success: false, message: "studentId and activityType are required" },
        { status: 400 },
      );
    }

    if (
      typeof studentId !== "string" ||
      !UUID_RE.test(studentId) ||
      (courseId && (typeof courseId !== "string" || !UUID_RE.test(courseId)))
    ) {
      return NextResponse.json(
        { success: false, message: "studentId and courseId must be UUIDs" },
        { status: 400 },
      );
    }

    // Only record activity for an existing student account
    const [student] = await pgDb
      .select({ id: UserSchema.id })
      .from(UserSchema)
      .where(and(eq(UserSchema.id, studentId), eq(UserSchema.role, "student")))
      .limit(1);
    if (!student) {
      return NextResponse.json(
        { success: false, message: "Student not found" },
        { status: 404 },
      );
    }

    const validTypes = [
      "material_viewed",
      "flashcard_reviewed",
      "study_guide_generated",
      "practice_questions_generated",
      "quiz_viewed",
      "assignment_viewed",
    ];
    if (!validTypes.includes(activityType)) {
      return NextResponse.json(
        {
          success: false,
          message: `Invalid activityType. Must be one of: ${validTypes.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const result = await recordActivity({
      studentId,
      activityType,
      courseId: courseId || null,
      weekNumber: weekNumber != null ? Number(weekNumber) : null,
      entityId: entityId || null,
      entityMetadata: entityMetadata || null,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("POST /api/internal/activity error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
