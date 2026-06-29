import { NextRequest, NextResponse } from "next/server";
import { requireFaculty, checkCourseInstructorAccess } from "@/lib/auth/faculty";
import { pgDb } from "@/lib/db/pg/db.pg";
import {
  StudentEnrollmentSchema,
  UserSchema,
} from "@/lib/db/pg/schema.pg";
import { eq, asc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const sessionOrError = await requireFaculty();
    if (sessionOrError instanceof NextResponse) return sessionOrError;
    const session = sessionOrError;

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");

    if (!courseId) {
      return NextResponse.json({ error: "courseId is required" }, { status: 400 });
    }

    // Verify faculty teaches this course
    const hasAccess = await checkCourseInstructorAccess(session.user.id, courseId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const enrollments = await pgDb
      .select({
        name: UserSchema.name,
        email: UserSchema.email,
        studentId: UserSchema.studentId,
        enrollmentStatus: StudentEnrollmentSchema.status,
        finalGrade: StudentEnrollmentSchema.finalGrade,
      })
      .from(StudentEnrollmentSchema)
      .innerJoin(UserSchema, eq(StudentEnrollmentSchema.studentId, UserSchema.id))
      .where(eq(StudentEnrollmentSchema.courseId, courseId))
      .orderBy(asc(UserSchema.name));

    return NextResponse.json({ success: true, data: enrollments });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch students", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
