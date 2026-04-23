import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { pgDb } from "@/lib/db/pg/db.pg";
import {
  UserSchema,
  StudentEnrollmentSchema,
  CourseSchema,
  ProgramSchema,
} from "@/lib/db/pg/schema.pg";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";
import {
  calculateCumulativeGPA,
  classifyDegree,
} from "@/lib/utils/grade-calculator";

const updateAcademicSchema = z.object({
  currentLevel: z.number().int().min(100).max(900).optional(),
  currentSemester: z.enum(["first", "second"]).optional(),
  academicYear: z.string().optional(),
  enrollmentStatus: z
    .enum(["active", "inactive", "graduated", "suspended", "transferred"])
    .optional(),
  programId: z.string().uuid().nullable().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminAccess = await requireAdmin();
    if (adminAccess instanceof NextResponse) {
      return adminAccess;
    }

    const { id } = await params;

    // Get student with program info
    const [student] = await pgDb
      .select({
        id: UserSchema.id,
        name: UserSchema.name,
        email: UserSchema.email,
        studentId: UserSchema.studentId,
        currentLevel: UserSchema.currentLevel,
        currentSemester: UserSchema.currentSemester,
        academicYear: UserSchema.academicYear,
        enrollmentStatus: UserSchema.enrollmentStatus,
        programId: UserSchema.programId,
        programName: ProgramSchema.name,
        programCode: ProgramSchema.code,
        admissionSession: UserSchema.admissionSession,
        admissionLevel: UserSchema.admissionLevel,
        graduationDate: UserSchema.graduationDate,
      })
      .from(UserSchema)
      .leftJoin(ProgramSchema, eq(UserSchema.programId, ProgramSchema.id))
      .where(and(eq(UserSchema.id, id), eq(UserSchema.role, "student")))
      .limit(1);

    if (!student) {
      return NextResponse.json(
        { success: false, error: "Student not found" },
        { status: 404 }
      );
    }

    // Get all enrollments with course details
    const enrollments = await pgDb
      .select({
        id: StudentEnrollmentSchema.id,
        courseId: StudentEnrollmentSchema.courseId,
        courseCode: CourseSchema.courseCode,
        courseTitle: CourseSchema.title,
        credits: CourseSchema.credits,
        semester: StudentEnrollmentSchema.semester,
        academicYear: StudentEnrollmentSchema.academicYear,
        status: StudentEnrollmentSchema.status,
        finalGrade: StudentEnrollmentSchema.finalGrade,
        gradePoints: StudentEnrollmentSchema.gradePoints,
        enrollmentDate: StudentEnrollmentSchema.enrollmentDate,
      })
      .from(StudentEnrollmentSchema)
      .innerJoin(
        CourseSchema,
        eq(StudentEnrollmentSchema.courseId, CourseSchema.id)
      )
      .where(eq(StudentEnrollmentSchema.studentId, id))
      .orderBy(
        StudentEnrollmentSchema.academicYear,
        StudentEnrollmentSchema.semester
      );

    // Identify carryover courses: failed enrollments with no subsequent successful attempt
    const failedEnrollments = enrollments.filter((e) => e.status === "failed");
    const completedCourseIds = new Set(
      enrollments
        .filter((e) => e.status === "completed")
        .map((e) => e.courseId)
    );
    const carryoverCourses = failedEnrollments.filter(
      (e) => !completedCourseIds.has(e.courseId)
    );

    // Calculate CGPA from completed enrollments
    const completedEnrollments = enrollments.filter(
      (e) => e.status === "completed" && e.gradePoints != null
    );
    const cgpa = calculateCumulativeGPA(
      completedEnrollments.map((e) => ({
        gradePoints: Number(e.gradePoints),
        credits: e.credits,
      }))
    );
    const degreeClassification = classifyDegree(cgpa);

    return NextResponse.json({
      success: true,
      data: {
        student,
        enrollments,
        carryoverCourses,
        cgpa,
        degreeClassification,
        totalCreditsCompleted: completedEnrollments.reduce(
          (sum, e) => sum + e.credits,
          0
        ),
        totalCreditsEnrolled: enrollments
          .filter((e) => e.status === "enrolled")
          .reduce((sum, e) => sum + e.credits, 0),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch student academic record",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminAccess = await requireAdmin();
    if (adminAccess instanceof NextResponse) {
      return adminAccess;
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = updateAcademicSchema.parse(body);

    // Check student exists
    const [existing] = await pgDb
      .select()
      .from(UserSchema)
      .where(and(eq(UserSchema.id, id), eq(UserSchema.role, "student")))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Student not found" },
        { status: 404 }
      );
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (validatedData.currentLevel !== undefined)
      updates.currentLevel = validatedData.currentLevel;
    if (validatedData.currentSemester !== undefined)
      updates.currentSemester = validatedData.currentSemester;
    if (validatedData.academicYear !== undefined)
      updates.academicYear = validatedData.academicYear;
    if (validatedData.enrollmentStatus !== undefined) {
      updates.enrollmentStatus = validatedData.enrollmentStatus;
      if (validatedData.enrollmentStatus === "graduated") {
        updates.graduationDate = new Date();
      }
    }
    if (validatedData.programId !== undefined)
      updates.programId = validatedData.programId;

    const [updated] = await pgDb
      .update(UserSchema)
      .set(updates)
      .where(eq(UserSchema.id, id))
      .returning({
        id: UserSchema.id,
        currentLevel: UserSchema.currentLevel,
        currentSemester: UserSchema.currentSemester,
        academicYear: UserSchema.academicYear,
        enrollmentStatus: UserSchema.enrollmentStatus,
        programId: UserSchema.programId,
      });

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Student academic record updated successfully",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update student academic record",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
