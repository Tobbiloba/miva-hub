import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { isAdminEmail } from "@/lib/auth/admin";
import { pgAcademicRepository as academicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";

export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin permissions
    const session = await getSession();
    if (!session?.user?.email || !isAdminEmail(session.user.email)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');
    const weekNumber = searchParams.get('weekNumber');

    if (!courseId) {
      return NextResponse.json(
        { 
          success: false, 
          message: "courseId parameter is required" 
        },
        { status: 400 }
      );
    }

    let materials;

    if (weekNumber) {
      // Get materials for a specific week
      materials = await academicRepository.getCourseMaterialsByWeek(courseId, parseInt(weekNumber));
    } else {
      // Get all materials for the course
      materials = await academicRepository.getCourseMaterials(courseId);
    }

    return NextResponse.json({
      success: true,
      data: materials
    });

  } catch (error) {
    console.error("Error fetching course materials:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to fetch course materials" 
      },
      { status: 500 }
    );
  }
}