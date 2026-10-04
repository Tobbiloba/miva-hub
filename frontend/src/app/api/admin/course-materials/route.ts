import { requireAdmin } from "@/lib/auth/admin";
import { pgAcademicRepository as academicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import { isSameTenant } from "@/lib/tenant";
import { resolveStatsScope } from "@/lib/tenant-content";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin permissions
    const sessionOrError = await requireAdmin();
    if (sessionOrError instanceof NextResponse) return sessionOrError;

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");
    const weekNumber = searchParams.get("weekNumber");

    // Tenant scope from the SESSION (super_admin → "all")
    const scope = await resolveStatsScope(sessionOrError.user.id);
    if (!scope) {
      return NextResponse.json(
        { success: false, message: "Admin is not assigned to a university" },
        { status: 403 },
      );
    }

    let materials;

    if (courseId) {
      // Tenant-checked: a foreign course looks like a missing one
      const course = await academicRepository.getCourseById(courseId);
      if (
        !course ||
        !(await isSameTenant(sessionOrError.user.id, course.universityId))
      ) {
        return NextResponse.json(
          { success: false, message: "Course not found" },
          { status: 404 },
        );
      }

      // Get materials for a specific course
      if (weekNumber) {
        // Get materials for a specific week
        materials = await academicRepository.getCourseMaterialsByWeek(
          courseId,
          parseInt(weekNumber),
        );
      } else {
        // Get all materials for the course
        materials = await academicRepository.getCourseMaterials(courseId);
      }
    } else {
      // Get all materials across all courses
      materials = await academicRepository.getAllCourseMaterials(scope);
    }

    return NextResponse.json({
      success: true,
      data: materials,
    });
  } catch (error) {
    console.error("Error fetching course materials:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch course materials",
      },
      { status: 500 },
    );
  }
}
