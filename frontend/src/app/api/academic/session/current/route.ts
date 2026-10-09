import { termKey } from "@/lib/utils/semester";
import { getApiSession } from "@/lib/auth/server";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import { pgUniversityRepository } from "@/lib/db/pg/repositories/university-repository.pg";
import { NextRequest, NextResponse } from "next/server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/academic/session/current[?university=<slug|id>] — PUBLIC.
 * Each university runs its own calendar, so the tenant comes from the
 * signed-in user, or from `university` before sign-up. Returns only
 * non-sensitive academic-calendar fields; keep it that way.
 */
export async function GET(request: NextRequest) {
  try {
    const authSession = await getApiSession();
    let universityId =
      (authSession?.user as { universityId?: string | null } | undefined)
        ?.universityId ?? null;

    if (!universityId) {
      const ref = request.nextUrl.searchParams.get("university")?.trim();
      if (!ref) {
        return NextResponse.json(
          { error: "university query parameter is required" },
          { status: 400 },
        );
      }
      const university = UUID_RE.test(ref)
        ? await pgUniversityRepository.findById(ref)
        : await pgUniversityRepository.findBySlug(ref.toLowerCase());
      if (!university || university.status !== "active") {
        return NextResponse.json(
          { error: "University not found" },
          { status: 404 },
        );
      }
      universityId = university.id;
    }

    const session =
      await pgAcademicRepository.getActiveAcademicSession(universityId);

    if (!session) {
      return NextResponse.json(
        { error: "No active academic session found" },
        { status: 404 },
      );
    }

    // Convert session name format "2025/2026" to academic year "2025-2026"
    const academicYear = session.sessionName.replace("/", "-");

    // Canonical term key stored on enrollments, e.g. "2025/2026-first"
    const enrollmentSemester = termKey(
      session.sessionName,
      session.currentSemester,
    );

    return NextResponse.json({
      sessionName: session.sessionName,
      currentSemester: session.currentSemester,
      academicYear,
      enrollmentSemester,
      status: session.status,
    });
  } catch (error) {
    console.error("Failed to fetch active session:", error);
    return NextResponse.json(
      { error: "Failed to fetch active session" },
      { status: 500 },
    );
  }
}
