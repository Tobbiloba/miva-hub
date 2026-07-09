import { requireAdmin } from "@/lib/auth/admin";
import { pgAcademicRepository as academicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin permissions
    const sessionOrError = await requireAdmin();
    if (sessionOrError instanceof NextResponse) return sessionOrError;

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");
    const weekNumber = searchParams.get("weekNumber");

    let materials;

    if (courseId) {
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
      materials = await academicRepository.getAllCourseMaterials();
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
