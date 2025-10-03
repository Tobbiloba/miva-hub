import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import { z } from "zod";

// Validation schema for updates
const updateDepartmentSchema = z.object({
  name: z.string().min(1, "Department name is required").max(100, "Name too long").optional(),
  code: z.string().min(1, "Department code is required").max(10, "Code too long").optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

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

    // Fetch department by ID
    const department = await pgAcademicRepository.getDepartmentById(id);

    if (!department) {
      return NextResponse.json({
        success: false,
        error: 'Department not found'
      }, { status: 404 });
    }

    // Get additional details
    const [courses, faculty] = await Promise.all([
      pgAcademicRepository.getCoursesByDepartment(id),
      pgAcademicRepository.getFacultyByDepartment(id)
    ]);

    const departmentWithDetails = {
      ...department,
      courses: courses.map(c => ({
        id: c.id,
        code: c.courseCode,
        title: c.title,
        credits: c.credits,
        isActive: c.isActive
      })),
      faculty: faculty.map(f => ({
        id: f.id,
        name: f.name,
        position: f.position,
        email: f.email,
        isActive: f.isActive
      })),
      statistics: {
        totalCourses: courses.length,
        activeCourses: courses.filter(c => c.isActive).length,
        totalFaculty: faculty.length,
        activeFaculty: faculty.filter(f => f.isActive).length
      }
    };

    return NextResponse.json({
      success: true,
      data: departmentWithDetails
    });

  } catch (error) {
    console.error('[Department API] GET Error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch department',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function PUT(
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

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateDepartmentSchema.parse(body);

    // Check if department exists
    const existingDepartment = await pgAcademicRepository.getDepartmentById(id);

    if (!existingDepartment) {
      return NextResponse.json({
        success: false,
        error: 'Department not found'
      }, { status: 404 });
    }

    // Check for duplicate code if code is being updated
    if (validatedData.code && validatedData.code !== existingDepartment.code) {
      const duplicateCode = await pgAcademicRepository.getDepartmentByCode(validatedData.code);
      if (duplicateCode && duplicateCode.id !== id) {
        return NextResponse.json({
          success: false,
          error: 'Department code already exists',
          message: `A department with code "${validatedData.code}" already exists`
        }, { status: 400 });
      }
    }

    // Update department using repository
    const updatedDepartment = await pgAcademicRepository.updateDepartment(id, {
      ...validatedData,
      code: validatedData.code?.toUpperCase() || existingDepartment.code
    });

    return NextResponse.json({
      success: true,
      data: updatedDepartment,
      message: `Department "${updatedDepartment.name}" updated successfully`
    });

  } catch (error) {
    console.error('[Department API] PUT Error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to update department',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE(
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

    // Check if department exists
    const department = await pgAcademicRepository.getDepartmentById(id);

    if (!department) {
      return NextResponse.json({
        success: false,
        error: 'Department not found'
      }, { status: 404 });
    }

    // Check for dependencies before deletion
    const [courses, faculty] = await Promise.all([
      pgAcademicRepository.getCoursesByDepartment(id),
      pgAcademicRepository.getFacultyByDepartment(id)
    ]);

    const activeCourses = courses.filter(c => c.isActive);
    const activeFaculty = faculty.filter(f => f.isActive);

    if (activeCourses.length > 0 || activeFaculty.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Cannot delete department with active dependencies',
        message: `Department has ${activeCourses.length} active courses and ${activeFaculty.length} active faculty members. Please reassign or deactivate them first.`,
        dependencies: {
          activeCourses: activeCourses.length,
          activeFaculty: activeFaculty.length
        }
      }, { status: 400 });
    }

    // Delete department using repository
    const success = await pgAcademicRepository.deleteDepartment(id);

    if (!success) {
      return NextResponse.json({
        success: false,
        error: 'Failed to delete department'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Department "${department.name}" deleted successfully`
    });

  } catch (error) {
    console.error('[Department API] DELETE Error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to delete department',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}