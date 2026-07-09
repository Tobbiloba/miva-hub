import { recordActivity } from "@/lib/progress/record-activity";
import { NextRequest, NextResponse } from "next/server";

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET || "miva-internal-2026";

/**
 * Internal endpoint for MCP server to record study activity events.
 * Authenticated via a shared secret header, not user session.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("x-internal-secret");
    if (authHeader !== INTERNAL_SECRET) {
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
