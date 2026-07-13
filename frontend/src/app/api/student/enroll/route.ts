import { getSession } from "@/lib/auth/server";
import { pgDb } from "@/lib/db/pg/db.pg";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import {
  CourseSchema,
  StudentEnrollmentSchema,
  UserSchema,
} from "@/lib/db/pg/schema.pg";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const enrollSchema = z.object({
  courseId: z.string().uuid("Invalid course ID"),
});

/**
 * Student self-enrollment into a course for the active semester.
 * Tenant-scoped: the course must belong to the student's own university.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user || session.user.role !== "student") {
      return NextResponse.json(
        { error: "Student authentication required" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { courseId } = enrollSchema.parse(body);

    // Tenant comes from the session user's row — never the request body
    const [userRow] = await pgDb
      .select({ universityId: UserSchema.universityId })
      .from(UserSchema)
      .where(eq(UserSchema.id, session.user.id))
      .limit(1);

    if (!userRow?.universityId) {
      return NextResponse.json(
        { error: "Your account is not linked to a university" },
        { status: 403 },
      );
    }

    const [course] = await pgDb
      .select({
        id: CourseSchema.id,
        courseCode: CourseSchema.courseCode,
        isActive: CourseSchema.isActive,
      })
      .from(CourseSchema)
      .where(
        and(
          eq(CourseSchema.id, courseId),
          eq(CourseSchema.universityId, userRow.universityId),
        ),
      )
      .limit(1);

    if (!course || !course.isActive) {
      return NextResponse.json(
        { error: "Course not found or not open for enrollment" },
        { status: 404 },
      );
    }

    // Current term comes from the academic_session table (the platform's
    // live source — academic_calendar is legacy and unpopulated)
    const activeSession = await pgAcademicRepository.getActiveAcademicSession();
    if (!activeSession) {
      return NextResponse.json(
        { error: "No active academic session — enrollment is closed" },
        { status: 409 },
      );
    }
    const semester = activeSession.currentSemester;
    const academicYear = activeSession.sessionName.replace("/", "-");

    const [existing] = await pgDb
      .select({
        id: StudentEnrollmentSchema.id,
        status: StudentEnrollmentSchema.status,
      })
      .from(StudentEnrollmentSchema)
      .where(
        and(
          eq(StudentEnrollmentSchema.studentId, session.user.id),
          eq(StudentEnrollmentSchema.courseId, courseId),
          eq(StudentEnrollmentSchema.semester, semester),
        ),
      )
      .limit(1);

    if (existing) {
      // Re-enrolling after a drop reactivates the same row
      if (existing.status === "dropped") {
        await pgDb
          .update(StudentEnrollmentSchema)
          .set({ status: "enrolled", updatedAt: new Date() })
          .where(eq(StudentEnrollmentSchema.id, existing.id));
        return NextResponse.json({
          success: true,
          message: `Re-enrolled in ${course.courseCode}`,
        });
      }
      return NextResponse.json(
        { error: "You are already enrolled in this course" },
        { status: 409 },
      );
    }

    await pgDb.insert(StudentEnrollmentSchema).values({
      studentId: session.user.id,
      courseId,
      semester,
      academicYear,
      status: "enrolled",
    });

    return NextResponse.json(
      { success: true, message: `Enrolled in ${course.courseCode}` },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 },
      );
    }
    console.error("Error enrolling student:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Drop a course (sets status to "dropped" — record is kept for history).
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user || session.user.role !== "student") {
      return NextResponse.json(
        { error: "Student authentication required" },
        { status: 401 },
      );
    }

    const courseId = request.nextUrl.searchParams.get("courseId");
    if (!courseId || !z.string().uuid().safeParse(courseId).success) {
      return NextResponse.json(
        { error: "Valid courseId query parameter required" },
        { status: 400 },
      );
    }

    const activeSession = await pgAcademicRepository.getActiveAcademicSession();
    if (!activeSession) {
      return NextResponse.json(
        { error: "No active academic session" },
        { status: 409 },
      );
    }

    const result = await pgDb
      .update(StudentEnrollmentSchema)
      .set({ status: "dropped", updatedAt: new Date() })
      .where(
        and(
          eq(StudentEnrollmentSchema.studentId, session.user.id),
          eq(StudentEnrollmentSchema.courseId, courseId),
          eq(StudentEnrollmentSchema.semester, activeSession.currentSemester),
          eq(StudentEnrollmentSchema.status, "enrolled"),
        ),
      )
      .returning({ id: StudentEnrollmentSchema.id });

    if (!result.length) {
      return NextResponse.json(
        { error: "No active enrollment found for this course" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, message: "Course dropped" });
  } catch (error) {
    console.error("Error dropping course:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
