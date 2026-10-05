import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import { pgUniversityRepository } from "@/lib/db/pg/repositories/university-repository.pg";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/programs/public?university=<slug> — PUBLIC (sign-up form).
 * Programs are per university; the sign-up page passes the slug resolved
 * from the student's email domain.
 */
export async function GET(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams
      .get("university")
      ?.trim()
      .toLowerCase();
    if (!slug) {
      return NextResponse.json(
        { error: "university query parameter is required" },
        { status: 400 },
      );
    }
    const university = await pgUniversityRepository.findBySlug(slug);
    if (!university || university.status !== "active") {
      return NextResponse.json(
        { error: "University not found" },
        { status: 404 },
      );
    }

    const programs = await pgAcademicRepository.getActivePrograms(
      university.id,
    );
    return NextResponse.json(programs);
  } catch (error) {
    console.error("Failed to fetch programs:", error);
    return NextResponse.json(
      { error: "Failed to fetch programs" },
      { status: 500 },
    );
  }
}
