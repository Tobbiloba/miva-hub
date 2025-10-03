import { NextRequest, NextResponse } from "next/server";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import { requireAdmin } from "@/lib/auth/admin";

export async function GET(request: NextRequest) {
  try {
    // Check admin authentication
    const sessionOrError = await requireAdmin();
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get('departmentId');

    let courses;
    
    if (departmentId) {
      // Get courses for specific department
      courses = await pgAcademicRepository.getCoursesByDepartment(departmentId);
    } else {
      // Get all active courses
      courses = await pgAcademicRepository.getActiveCourses();
    }
    
    return NextResponse.json(courses);
  } catch (error) {
    console.error("Error fetching courses:", error);
    return NextResponse.json(
      { error: "Failed to fetch courses" },
      { status: 500 }
    );
  }
}