import { requireAdmin } from "@/lib/auth/admin";
import {
  CourseRequestError,
  addRequestedCourse,
  dismissCourseRequests,
  listCourseRequests,
} from "@/lib/capture-sync/course-requests";
import { getAdminScope } from "@/lib/tenant";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const ActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("add"),
    universityId: z.string().uuid().optional(),
    courseCode: z
      .string()
      .trim()
      .regex(/^[A-Za-z]{2,4}\d{3}$/, "Invalid course code"),
    title: z.string().trim().min(1).max(200),
    departmentId: z.string().uuid("Pick a department"),
  }),
  z.object({
    action: z.literal("dismiss"),
    universityId: z.string().uuid().optional(),
    courseCode: z
      .string()
      .trim()
      .regex(/^[A-Za-z]{2,4}\d{3}$/, "Invalid course code"),
  }),
]);

/**
 * The admin's university scope: super admins act on any university (named
 * in the request), university admins only on their own.
 */
async function scopedUniversity(
  adminId: string,
  requested?: string,
): Promise<string | null | NextResponse> {
  const scope = await getAdminScope(adminId);
  if (scope.superAdmin) return requested ?? null;
  if (!scope.university) {
    return NextResponse.json(
      { error: "Admin access required" },
      { status: 403 },
    );
  }
  if (requested && requested !== scope.university.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return scope.university.id;
}

/** GET /api/admin/course-requests — courses students are waiting for. */
export async function GET() {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;
  const universityId = await scopedUniversity(session.user.id);
  if (universityId instanceof NextResponse) return universityId;
  return NextResponse.json(await listCourseRequests(universityId));
}

/** POST /api/admin/course-requests — add the course, or dismiss the requests. */
export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const parsed = ActionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }
  const universityId = await scopedUniversity(
    session.user.id,
    parsed.data.universityId,
  );
  if (universityId instanceof NextResponse) return universityId;
  if (!universityId) {
    return NextResponse.json(
      { error: "universityId is required" },
      { status: 400 },
    );
  }

  try {
    if (parsed.data.action === "dismiss") {
      const dismissed = await dismissCourseRequests(
        universityId,
        parsed.data.courseCode,
      );
      return NextResponse.json({ dismissed });
    }
    return NextResponse.json(
      await addRequestedCourse({
        universityId,
        courseCode: parsed.data.courseCode,
        title: parsed.data.title,
        departmentId: parsed.data.departmentId,
      }),
    );
  } catch (error) {
    if (error instanceof CourseRequestError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    throw error;
  }
}
