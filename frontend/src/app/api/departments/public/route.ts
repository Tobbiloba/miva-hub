import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import { pgUniversityRepository } from "@/lib/db/pg/repositories/university-repository.pg";
import { NextRequest, NextResponse } from "next/server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  try {
    // Public access (signup) — but always for ONE university, resolved from
    // ?university=<slug|id>. Never lists every tenant's departments.
    const universityParam = request.nextUrl.searchParams
      .get("university")
      ?.trim();
    if (!universityParam) {
      return NextResponse.json(
        { error: "university parameter is required" },
        { status: 400 },
      );
    }

    const university = UUID_RE.test(universityParam)
      ? await pgUniversityRepository.findById(universityParam)
      : await pgUniversityRepository.findBySlug(universityParam.toLowerCase());
    if (!university || university.status !== "active") {
      return NextResponse.json(
        { error: "University not found" },
        { status: 404 },
      );
    }

    const departments = await pgAcademicRepository.getDepartments(
      university.id,
    );

    // Non-sensitive fields only (no contacts / head-of-department ids)
    const formattedDepartments = departments.map((dept) => ({
      value: dept.code.toLowerCase().replace(/\s+/g, "-"),
      label: dept.name,
      code: dept.code,
      id: dept.id,
    }));

    return NextResponse.json(formattedDepartments);
  } catch (error) {
    console.error("Error fetching public departments:", error);
    return NextResponse.json(
      { error: "Failed to fetch departments" },
      { status: 500 },
    );
  }
}
