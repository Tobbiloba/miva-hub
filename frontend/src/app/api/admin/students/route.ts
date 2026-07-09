import { requireAdmin } from "@/lib/auth/admin";
import { pgDb } from "@/lib/db/pg/db.pg";
import { AccountSchema, UserSchema } from "@/lib/db/pg/schema.pg";
import { hashPassword } from "better-auth/crypto";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Validation schema for student creation
const createStudentSchema = z.object({
  name: z.string().min(1, "Student name is required").max(100, "Name too long"),
  // Domain is validated per-tenant in the handler (admin's university)
  email: z.string().email("Invalid email format"),
  studentId: z
    .string()
    .min(1, "Student ID is required")
    .max(20, "Student ID too long"),
  academicYear: z.enum(["100", "200", "300", "400"], {
    error: "Academic year must be 100, 200, 300, or 400",
  }),
  enrollmentStatus: z.enum(
    ["active", "inactive", "suspended", "graduated", "transferred"],
    {
      error: "Invalid enrollment status",
    },
  ),
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
    const search = searchParams.get("search");
    const academicYear = searchParams.get("academicYear");
    const enrollmentStatus = searchParams.get("enrollmentStatus");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Tenant scope: super_admin is unscoped by role; a university admin
    // without a university is misconfigured and gets 403, never unfiltered
    const { getAdminScope } = await import("@/lib/tenant");
    const scope = await getAdminScope(adminAccess.user.id);
    if (!scope.superAdmin && !scope.university) {
      return NextResponse.json(
        { success: false, message: "Admin is not assigned to a university" },
        { status: 403 },
      );
    }

    // Build query conditions
    const whereConditions = [eq(UserSchema.role, "student")];
    if (scope.university) {
      whereConditions.push(eq(UserSchema.universityId, scope.university.id));
    }

    // Add search filter
    if (search) {
      // This would need to be implemented with proper SQL search
      // For now, we'll get all students and filter in memory
    }

    // Fetch students
    const students = await pgDb
      .select()
      .from(UserSchema)
      .where(and(...whereConditions))
      .limit(limit)
      .offset(offset)
      .orderBy(UserSchema.createdAt);

    // Apply client-side filtering if needed
    let filteredStudents = students;

    if (search) {
      const searchLower = search.toLowerCase();
      filteredStudents = students.filter(
        (student) =>
          student.name.toLowerCase().includes(searchLower) ||
          student.email.toLowerCase().includes(searchLower) ||
          ((student as any).studentId || "")
            .toLowerCase()
            .includes(searchLower),
      );
    }

    if (academicYear && academicYear !== "all") {
      filteredStudents = filteredStudents.filter(
        (student) => (student as any).academicYear === academicYear,
      );
    }

    if (enrollmentStatus && enrollmentStatus !== "all") {
      filteredStudents = filteredStudents.filter(
        (student) => (student as any).enrollmentStatus === enrollmentStatus,
      );
    }

    // Never expose password hashes to the client
    const safeStudents = filteredStudents.map(
      ({ password: _password, ...rest }) => rest,
    );

    return NextResponse.json({
      success: true,
      data: safeStudents,
      total: filteredStudents.length,
      hasMore: students.length === limit,
    });
  } catch (error) {
    console.error("[Students API] GET Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch students",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
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

    // Tenant check: email must be on the admin's university domain list
    const { emailMatchesUniversity, getUserUniversity } = await import(
      "@/lib/tenant"
    );
    const adminUniversity = await getUserUniversity(adminAccess.user.id);
    if (!adminUniversity) {
      return NextResponse.json(
        {
          success: false,
          error: "No university associated with your admin account",
        },
        { status: 403 },
      );
    }
    if (!emailMatchesUniversity(validatedData.email, adminUniversity)) {
      return NextResponse.json(
        {
          success: false,
          error: `Email must use one of your university's domains: ${adminUniversity.emailDomains.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Check for duplicate email
    const existingUserByEmail = await pgDb
      .select()
      .from(UserSchema)
      .where(eq(UserSchema.email, validatedData.email))
      .limit(1);

    if (existingUserByEmail.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Email already exists",
          message: `A user with email "${validatedData.email}" already exists`,
        },
        { status: 400 },
      );
    }

    // Check for duplicate student ID
    const existingUserByStudentId = await pgDb
      .select()
      .from(UserSchema)
      .where(eq((UserSchema as any).studentId, validatedData.studentId))
      .limit(1);

    if (existingUserByStudentId.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Student ID already exists",
          message: `A student with ID "${validatedData.studentId}" already exists`,
        },
        { status: 400 },
      );
    }

    // Generate a temporary password (student should change this on first login).
    // Hash with better-auth's algorithm — sign-in verifies the credential
    // account row, so a bcrypt hash on UserSchema alone can never log in.
    const tempPassword = `student${validatedData.academicYear}${Math.random().toString(36).slice(-4)}`;
    const hashedPassword = await hashPassword(tempPassword);

    // Create the student user + credential account row atomically
    const newStudent = await pgDb.transaction(async (tx) => {
      const createdRows = await tx
        .insert(UserSchema)
        .values({
          name: validatedData.name,
          email: validatedData.email,
          password: hashedPassword,
          role: "student",
          universityId: adminUniversity.id,
          // Admin-created accounts are pre-verified (domain checked above);
          // no verification-email flow exists, and false blocks sign-in.
          emailVerified: true,
          studentId: validatedData.studentId,
          academicYear: validatedData.academicYear,
          enrollmentStatus: validatedData.enrollmentStatus,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      const created = createdRows[0];
      await tx.insert(AccountSchema).values({
        accountId: created.id,
        providerId: "credential",
        userId: created.id,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return [created];
    });

    // Remove password from response
    const { password: _, ...studentData } = newStudent[0];

    return NextResponse.json(
      {
        success: true,
        data: {
          ...studentData,
          tempPassword, // Include temporary password for admin to share with student
        },
        message: `Student "${validatedData.name}" created successfully`,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[Students API] POST Error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: error.issues,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to create student",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
