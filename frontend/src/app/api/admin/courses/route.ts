import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import { z } from "zod";

// Validation schemas
const createCourseSchema = z.object({
  courseCode: z.string().min(1, "Course code is required").max(20, "Course code too long"),
  title: z.string().min(1, "Course title is required").max(200, "Title too long"),
  description: z.string().optional(),
  credits: z.number().int().min(1, "Credits must be at least 1").max(6, "Credits cannot exceed 6"),
  departmentId: z.string().uuid("Invalid department ID"),
  level: z.enum(["100L", "200L", "300L", "400L", "graduate", "doctoral"], {
    errorMap: () => ({ message: "Level must be 100L, 200L, 300L, 400L, graduate, or doctoral" })
  }),
  semesterOffered: z.enum(["fall", "spring", "summer", "both"], {
    errorMap: () => ({ message: "Semester must be fall, spring, summer, or both" })
  }).default("both"),
  isActive: z.boolean().default(true),
  totalWeeks: z.number().int().min(1, "Total weeks must be at least 1").max(52, "Total weeks cannot exceed 52").default(16),
  startDate: z.string().optional().refine((date) => {
    if (!date) return true;
    return !isNaN(Date.parse(date));
  }, "Invalid start date format"),
  endDate: z.string().optional().refine((date) => {
    if (!date) return true;
    return !isNaN(Date.parse(date));
  }, "Invalid end date format")
}).refine((data) => {
  if (data.startDate && data.endDate) {
    return new Date(data.startDate) < new Date(data.endDate);
  }
  return true;
}, {
  message: "End date must be after start date",
  path: ["endDate"]
});

export async function GET(request: NextRequest) {
  try {
    // Check admin access
    const adminAccess = await requireAdmin();
    if (adminAccess instanceof NextResponse) {
      return adminAccess;
    }

    // Get query parameters for filtering/searching
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const departmentId = searchParams.get('departmentId');
    const level = searchParams.get('level');
    const isActive = searchParams.get('isActive');

    // Fetch courses
    let courses = await pgAcademicRepository.getAllCourses();

    // Apply filters
    if (search) {
      const searchLower = search.toLowerCase();
      courses = courses.filter(course => 
        course.courseCode.toLowerCase().includes(searchLower) ||
        course.title.toLowerCase().includes(searchLower) ||
        (course.description && course.description.toLowerCase().includes(searchLower))
      );
    }

    if (departmentId) {
      courses = courses.filter(course => course.departmentId === departmentId);
    }

    if (level) {
      courses = courses.filter(course => course.level === level);
    }

    if (isActive !== null) {
      const activeFilter = isActive === 'true';
      courses = courses.filter(course => course.isActive === activeFilter);
    }

    // Get department info for each course
    const coursesWithDepartments = await Promise.all(
      courses.map(async (course) => {
        const department = await pgAcademicRepository.getDepartmentById(course.departmentId);
        return {
          ...course,
          department: department ? {
            id: department.id,
            name: department.name,
            code: department.code
          } : null
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: coursesWithDepartments,
      total: coursesWithDepartments.length
    });

  } catch (error) {
    console.error('[Courses API] GET Error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch courses',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check admin access
    const adminAccess = await requireAdmin();
    if (adminAccess instanceof NextResponse) {
      return adminAccess;
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createCourseSchema.parse(body);

    // Check for duplicate course code
    const existingCourse = await pgAcademicRepository.getCourseByCode(validatedData.courseCode);
    if (existingCourse) {
      return NextResponse.json({
        success: false,
        error: 'Course code already exists',
        message: `A course with code "${validatedData.courseCode}" already exists`
      }, { status: 400 });
    }

    // Verify department exists
    const department = await pgAcademicRepository.getDepartmentById(validatedData.departmentId);
    if (!department) {
      return NextResponse.json({
        success: false,
        error: 'Department not found',
        message: `Department with ID "${validatedData.departmentId}" does not exist`
      }, { status: 400 });
    }

    // Create course using repository
    const createdCourse = await pgAcademicRepository.createCourse({
      ...validatedData,
      courseCode: validatedData.courseCode.toUpperCase(),
      startDate: validatedData.startDate ? new Date(validatedData.startDate) : null,
      endDate: validatedData.endDate ? new Date(validatedData.endDate) : null
    });

    // Include department info in response
    const courseWithDepartment = {
      ...createdCourse,
      department: {
        id: department.id,
        name: department.name,
        code: department.code
      }
    };

    return NextResponse.json({
      success: true,
      data: courseWithDepartment,
      message: `Course "${validatedData.courseCode}" created successfully`
    }, { status: 201 });

  } catch (error) {
    console.error('[Courses API] POST Error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to create course',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}