import { requireAdmin } from "@/lib/auth/admin";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import { resolveStatsScope } from "@/lib/tenant-content";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Check admin authentication
    const sessionOrError = await requireAdmin();
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    // Tenant scope from the SESSION (super_admin → "all")
    const scope = await resolveStatsScope(sessionOrError.user.id);
    if (!scope) {
      return NextResponse.json(
        { error: "Admin is not assigned to a university" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get("departmentId");

    let courses;

    if (departmentId) {
      // Get courses for specific department
      courses = await pgAcademicRepository.getCoursesByDepartment(departmentId);
    } else {
      // Get all active courses
      courses = await pgAcademicRepository.getActiveCourses();
    }

    // Only the admin's own university's courses (a foreign departmentId
    // simply yields nothing)
    if (scope !== "all") {
      courses = courses.filter((course) => course.universityId === scope);
    }

    return NextResponse.json(courses);
  } catch (error) {
    console.error("Error fetching courses:", error);
    return NextResponse.json(
      { error: "Failed to fetch courses" },
      { status: 500 },
    );
  }
}
