import { requireStudent } from "@/lib/auth/student";
import {
  describeActivity,
  getRecentActivity,
} from "@/lib/memory/student-memory";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const QuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(30),
  courseCode: z.string().trim().max(20).optional(),
});

/**
 * GET /api/student/activity — the student's own study timeline (what the
 * assistant remembers, lib/memory). Scoped to the session's student.
 */
export async function GET(request: NextRequest) {
  const session = await requireStudent();
  if (session instanceof NextResponse) return session;

  const parsed = QuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }
  const events = await getRecentActivity(session.user.id, {
    ...parsed.data,
    limit: 100,
  });
  return NextResponse.json({
    events: events
      // Individual flashcard reviews are too granular for a timeline
      .filter((e) => e.type !== "flashcard_reviewed")
      .map((e) => ({
        type: e.type,
        courseCode: e.courseCode,
        at: e.at,
        text: describeActivity(e),
      })),
    flashcardsReviewed: events.filter((e) => e.type === "flashcard_reviewed")
      .length,
  });
}
