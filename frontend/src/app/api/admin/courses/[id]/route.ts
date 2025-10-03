import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import { z } from "zod";

// Validation schemas
const updateCourseSchema = z.object({
  courseCode: z.string().min(1, "Course code is required").max(20, "Course code too long").optional(),
  title: z.string().min(1, "Course title is required").max(200, "Title too long").optional(),
  description: z.string().optional(),
  credits: z.number().int().min(1, "Credits must be at least 1").max(6, "Credits cannot exceed 6").optional(),
  departmentId: z.string().uuid("Invalid department ID").optional(),
  level: z.enum(["100L", "200L", "300L", "400L", "graduate", "doctoral"]).optional(),
  semesterOffered: z.enum(["fall", "spring", "summer", "both"]).optional(),
  isActive: z.boolean().optional(),
  totalWeeks: z.number().int().min(1, "Total weeks must be at least 1").max(52, "Total weeks cannot exceed 52").optional(),
  startDate: z.string().optional().refine((date) => {
    if (!date) return true;
    return !isNaN(Date.parse(date));
  }, "Invalid start date format"),
  endDate: z.string().optional().refine((date) => {
    if (!date) return true;
    return !isNaN(Date.parse(date));
  }, "Invalid end date format")
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check admin access
    const adminAccess = await requireAdmin();
    if (adminAccess instanceof NextResponse) {
      return adminAccess;
    }

    const courseId = params.id;

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
