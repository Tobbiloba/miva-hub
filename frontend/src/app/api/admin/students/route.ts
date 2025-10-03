import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { pgDb } from "@/lib/db/pg/db.pg";
import { UserSchema } from "@/lib/db/pg/schema.pg";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { hash } from "bcryptjs";

// Validation schema for student creation
const createStudentSchema = z.object({
  name: z.string().min(1, "Student name is required").max(100, "Name too long"),
  email: z.string().email("Invalid email format").refine(
    (email) => email.endsWith('@miva.edu.ng'),
    "Email must be a valid MIVA University email (@miva.edu.ng)"
  ),
  studentId: z.string().min(1, "Student ID is required").max(20, "Student ID too long"),
  academicYear: z.enum(["100", "200", "300", "400"], {
    errorMap: () => ({ message: "Academic year must be 100, 200, 300, or 400" })
  }),
  enrollmentStatus: z.enum(["active", "inactive", "suspended", "graduated", "transferred"], {
    errorMap: () => ({ message: "Invalid enrollment status" })
  }),
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
    const academicYear = searchParams.get('academicYear');
    const enrollmentStatus = searchParams.get('enrollmentStatus');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query conditions
    const whereConditions = [eq(UserSchema.role, 'student')];

    // Add search filter
    if (search) {
      // This would need to be implemented with proper SQL search
      // For now, we'll get all students and filter in memory
    }

    // Fetch students
    const students = await pgDb
      .select()
      .from(UserSchema)
      .where(eq(UserSchema.role, 'student'))
      .limit(limit)
      .offset(offset)
      .orderBy(UserSchema.createdAt);

    // Apply client-side filtering if needed
    let filteredStudents = students;
    
    if (search) {
      const searchLower = search.toLowerCase();
      filteredStudents = students.filter(student => 
        student.name.toLowerCase().includes(searchLower) ||
        student.email.toLowerCase().includes(searchLower) ||
        ((student as any).studentId || '').toLowerCase().includes(searchLower)
      );
    }

    if (academicYear && academicYear !== 'all') {
      filteredStudents = filteredStudents.filter(student => 
        (student as any).academicYear === academicYear
      );
    }

    if (enrollmentStatus && enrollmentStatus !== 'all') {
      filteredStudents = filteredStudents.filter(student => 
        (student as any).enrollmentStatus === enrollmentStatus
      );
    }

    return NextResponse.json({
      success: true,
      data: filteredStudents,
      total: filteredStudents.length,
      hasMore: students.length === limit
    });

  } catch (error) {
    console.error('[Students API] GET Error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch students',
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
    const validatedData = createStudentSchema.parse(body);

    // Check for duplicate email
    const existingUserByEmail = await pgDb
      .select()
      .from(UserSchema)
      .where(eq(UserSchema.email, validatedData.email))
      .limit(1);

    if (existingUserByEmail.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Email already exists',
        message: `A user with email "${validatedData.email}" already exists`
      }, { status: 400 });
    }

    // Check for duplicate student ID
    const existingUserByStudentId = await pgDb
      .select()
      .from(UserSchema)
      .where(eq((UserSchema as any).studentId, validatedData.studentId))
      .limit(1);

    if (existingUserByStudentId.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Student ID already exists',
        message: `A student with ID "${validatedData.studentId}" already exists`
      }, { status: 400 });
    }

    // Generate a temporary password (student should change this on first login)
    const tempPassword = `miva${validatedData.academicYear}${Math.random().toString(36).slice(-4)}`;
    const hashedPassword = await hash(tempPassword, 12);

    // Create the student user
    const newStudent = await pgDb
      .insert(UserSchema)
      .values({
        id: crypto.randomUUID(),
        name: validatedData.name,
        email: validatedData.email,
        password: hashedPassword,
        role: 'student',
        isEmailVerified: false,
        // Add student-specific fields
        ...(validatedData.studentId && { studentId: validatedData.studentId }),
        ...(validatedData.academicYear && { academicYear: validatedData.academicYear }),
        ...(validatedData.enrollmentStatus && { enrollmentStatus: validatedData.enrollmentStatus }),
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    // Remove password from response
    const { password: _, ...studentData } = newStudent[0];

    return NextResponse.json({
      success: true,
      data: {
        ...studentData,
        tempPassword // Include temporary password for admin to share with student
      },
      message: `Student "${validatedData.name}" created successfully`
    }, { status: 201 });

  } catch (error) {
    console.error('[Students API] POST Error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to create student',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}