import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import { z } from "zod";

// Validation schemas
const createDepartmentSchema = z.object({
  name: z.string().min(1, "Department name is required").max(100, "Name too long"),
  code: z.string().min(1, "Department code is required").max(10, "Code too long"),
  description: z.string().optional(),
});

const updateDepartmentSchema = createDepartmentSchema.partial();

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
    const includeStats = searchParams.get('includeStats') === 'true';

    // Fetch departments
    const departments = await pgAcademicRepository.getDepartments();

    // Filter by search if provided
    let filteredDepartments = departments;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredDepartments = departments.filter(dept => 
        dept.name.toLowerCase().includes(searchLower) ||
        dept.code.toLowerCase().includes(searchLower)
      );
    }

    // Include statistics if requested
    if (includeStats) {
      const departmentsWithStats = await Promise.all(
        filteredDepartments.map(async (dept) => {
          const [courses, faculty] = await Promise.all([
            pgAcademicRepository.getCoursesByDepartment(dept.id),
            pgAcademicRepository.getFacultyByDepartment(dept.id)
          ]);

          return {
            ...dept,
            statistics: {
              totalCourses: courses.length,
              activeCourses: courses.filter(c => c.isActive).length,
              totalFaculty: faculty.length,
              activeFaculty: faculty.filter(f => f.isActive).length
            }
          };
        })
      );

      return NextResponse.json({
        success: true,
        data: departmentsWithStats,
        total: departmentsWithStats.length
      });
    }

    return NextResponse.json({
      success: true,
      data: filteredDepartments,
      total: filteredDepartments.length
    });

  } catch (error) {
    console.error('[Departments API] GET Error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch departments',
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
    const validatedData = createDepartmentSchema.parse(body);

    // Check for duplicate department code
    const existingDepartment = await pgAcademicRepository.getDepartmentByCode(validatedData.code);
    if (existingDepartment) {
      return NextResponse.json({
        success: false,
        error: 'Department code already exists',
        message: `A department with code "${validatedData.code}" already exists`
      }, { status: 400 });
    }

    // Create department (this would need to be implemented in the repository)
    // For now, we'll simulate the creation
    const newDepartment = {
      id: crypto.randomUUID(),
      name: validatedData.name,
      code: validatedData.code.toUpperCase(),
      description: validatedData.description || null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Create department using repository
    const createdDepartment = await pgAcademicRepository.createDepartment(validatedData);

    return NextResponse.json({
      success: true,
      data: createdDepartment,
      message: `Department "${validatedData.name}" created successfully`
    }, { status: 201 });

  } catch (error) {
    console.error('[Departments API] POST Error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to create department',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}