import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { pgDb } from "@/lib/db/pg/db.pg";
import { UserSchema, StudentEnrollmentSchema } from "@/lib/db/pg/schema.pg";
import { z } from "zod";
import { eq, and } from "drizzle-orm";

// Validation schema for student updates
const updateStudentSchema = z.object({
  name: z.string().min(1, "Student name is required").max(100, "Name too long").optional(),
  email: z.string().email("Invalid email format").refine(
    (email) => email.endsWith('@miva.edu.ng'),
    "Email must be a valid MIVA University email (@miva.edu.ng)"
  ).optional(),
  studentId: z.string().min(1, "Student ID is required").max(20, "Student ID too long").optional(),
  academicYear: z.enum(["100", "200", "300", "400"]).optional(),
  enrollmentStatus: z.enum(["active", "inactive", "suspended", "graduated", "transferred"]).optional(),
  isEmailVerified: z.boolean().optional(),
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

    // Fetch student by ID
    const student = await pgDb
      .select()
      .from(UserSchema)
      .where(and(
        eq(UserSchema.id, id),
        eq(UserSchema.role, 'student')
      ))
      .limit(1);

    if (student.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Student not found'
      }, { status: 404 });
    }

    // Get student's enrollments
    const enrollments = await pgDb
      .select()
      .from(StudentEnrollmentSchema)
      .where(eq(StudentEnrollmentSchema.studentId, id));

    // Remove password from response
    const { password: _, ...studentData } = student[0];

    const studentWithDetails = {
      ...studentData,
      enrollments: enrollments.map(enrollment => ({
        id: enrollment.id,
        courseId: enrollment.courseId,
        semester: enrollment.semester,
        year: enrollment.year,
        status: enrollment.status,
        enrolledAt: enrollment.enrolledAt
      })),
      statistics: {
        totalEnrollments: enrollments.length,
        activeEnrollments: enrollments.filter(e => e.status === 'enrolled').length,
        completedEnrollments: enrollments.filter(e => e.status === 'completed').length
      }
    };

    return NextResponse.json({
      success: true,
      data: studentWithDetails
    });

  } catch (error) {
    console.error('[Student API] GET Error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch student',
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
    const validatedData = updateStudentSchema.parse(body);

    // Check if student exists
    const existingStudent = await pgDb
      .select()
      .from(UserSchema)
      .where(and(
        eq(UserSchema.id, id),
        eq(UserSchema.role, 'student')
      ))
      .limit(1);

    if (existingStudent.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Student not found'
      }, { status: 404 });
    }

    // Check for duplicate email if email is being updated
    if (validatedData.email && validatedData.email !== existingStudent[0].email) {
      const duplicateEmail = await pgDb
        .select()
        .from(UserSchema)
        .where(eq(UserSchema.email, validatedData.email))
        .limit(1);

      if (duplicateEmail.length > 0) {
        return NextResponse.json({
          success: false,
          error: 'Email already exists',
          message: `A user with email "${validatedData.email}" already exists`
        }, { status: 400 });
      }
    }

    // Check for duplicate student ID if student ID is being updated
    if (validatedData.studentId && validatedData.studentId !== (existingStudent[0] as any).studentId) {
      const duplicateStudentId = await pgDb
        .select()
        .from(UserSchema)
        .where(eq((UserSchema as any).studentId, validatedData.studentId))
        .limit(1);

      if (duplicateStudentId.length > 0) {
        return NextResponse.json({
          success: false,
          error: 'Student ID already exists',
          message: `A student with ID "${validatedData.studentId}" already exists`
        }, { status: 400 });
      }
    }

    // Update the student
    const updatedStudent = await pgDb
      .update(UserSchema)
      .set({
        ...validatedData,
        updatedAt: new Date()
      })
      .where(eq(UserSchema.id, id))
      .returning();

    // Remove password from response
    const { password: _, ...studentData } = updatedStudent[0];

    return NextResponse.json({
      success: true,
      data: studentData,
      message: `Student "${studentData.name}" updated successfully`
    });

  } catch (error) {
    console.error('[Student API] PUT Error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to update student',
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

    // Check if student exists
    const existingStudent = await pgDb
      .select()
      .from(UserSchema)
      .where(and(
        eq(UserSchema.id, id),
        eq(UserSchema.role, 'student')
      ))
      .limit(1);

    if (existingStudent.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Student not found'
      }, { status: 404 });
    }

    // Check for active enrollments before deletion
    const activeEnrollments = await pgDb
      .select()
      .from(StudentEnrollmentSchema)
      .where(and(
        eq(StudentEnrollmentSchema.studentId, id),
        eq(StudentEnrollmentSchema.status, 'enrolled')
      ));

    if (activeEnrollments.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Cannot delete student with active enrollments',
        message: `Student has ${activeEnrollments.length} active enrollments. Please unenroll them first.`,
        dependencies: {
          activeEnrollments: activeEnrollments.length
        }
      }, { status: 400 });
    }

    // Soft delete by updating enrollment status instead of hard delete
    // This preserves academic records while marking student as inactive
    await pgDb
      .update(UserSchema)
      .set({
        enrollmentStatus: 'transferred',
        isEmailVerified: false,
        updatedAt: new Date()
      })
      .where(eq(UserSchema.id, id));

    return NextResponse.json({
      success: true,
      message: `Student "${existingStudent[0].name}" removed successfully`
    });

  } catch (error) {
    console.error('[Student API] DELETE Error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to delete student',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}