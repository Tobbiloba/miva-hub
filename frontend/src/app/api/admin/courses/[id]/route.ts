import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check admin access
    const adminAccess = await requireAdmin();
    if (adminAccess instanceof NextResponse) {
      return adminAccess;
    }

    const { id } = await params;
    const courseId = id;

    // Get course by ID
    const course = await pgAcademicRepository.getCourseById(courseId);
    if (!course) {
      return NextResponse.json({
        success: false,
        error: 'Course not found',
        message: `Course with ID "${courseId}" does not exist`
      }, { status: 404 });
    }

    // Get department info
    const department = await pgAcademicRepository.getDepartmentById(course.departmentId);
    
    const courseWithDepartment = {
      ...course,
      department: department ? {
        id: department.id,
        name: department.name,
        code: department.code
      } : null
    };

    return NextResponse.json({
      success: true,
      data: courseWithDepartment
    });

  } catch (error) {
    console.error('[Course API] GET Error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch course',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
