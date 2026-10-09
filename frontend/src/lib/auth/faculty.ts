import { pgDb } from "@/lib/db/pg/db.pg";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import {
  CourseInstructorSchema,
  CourseSchema,
  FacultySchema,
  UserSchema,
} from "@/lib/db/pg/schema.pg";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getApiSession } from "./server";

/**
 * Faculty Authentication and Authorization Helper Functions
 * Provides secure faculty role verification and course access control
 */

/**
 * Validates that the current user is an active faculty member
 * @returns Session object or NextResponse error
 */
export async function requireFaculty() {
  // getApiSession returns null instead of redirecting: a redirect thrown
  // inside an API route's try/catch surfaced as a 500.
  const session = await getApiSession();

  if (!session?.user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  // Role from the DB, not the cached session payload (cached for up to an
  // hour, so a demotion would otherwise keep faculty access).
  const [userRow] = await pgDb
    .select({ role: UserSchema.role })
    .from(UserSchema)
    .where(eq(UserSchema.id, session.user.id))
    .limit(1);
  if (userRow?.role !== "faculty") {
    return NextResponse.json(
      { error: "Faculty access required" },
      { status: 403 },
    );
  }

  // Verify faculty record exists and is active
  try {
    const facultyRecord = await pgAcademicRepository.getFacultyByUserId(
      session.user.id,
    );

    if (!facultyRecord) {
      return NextResponse.json(
        { error: "Faculty record not found" },
        { status: 403 },
      );
    }

    if (!facultyRecord.isActive) {
      return NextResponse.json(
        { error: "Faculty account is inactive" },
        { status: 403 },
      );
    }
  } catch (error) {
    console.error("Error verifying faculty status:", error);
    return NextResponse.json(
      { error: "Authentication verification failed" },
      { status: 500 },
    );
  }

  return session;
}

/**
 * Extracts faculty information from session and database
 * @param session - Optional session object (will fetch if not provided)
 * @returns Faculty info object or null
 */
export function getFacultyInfo(session?: any) {
  if (!session?.user) return null;
  if (session.user.role !== "faculty") return null;

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role,
  };
}

/**
 * Is this faculty member assigned to teach this course, within their own
 * university? Assignment in any term is the access signal (same rule as
 * material access and lecture studio) — access must not hinge on matching a
 * semester string.
 */
export async function checkCourseInstructorAccess(
  facultyUserId: string,
  courseId: string,
): Promise<boolean> {
  try {
    const [row] = await pgDb
      .select({ id: CourseInstructorSchema.id })
      .from(CourseInstructorSchema)
      .innerJoin(
        FacultySchema,
        eq(CourseInstructorSchema.facultyId, FacultySchema.id),
      )
      .innerJoin(UserSchema, eq(FacultySchema.userId, UserSchema.id))
      .innerJoin(
        CourseSchema,
        eq(CourseInstructorSchema.courseId, CourseSchema.id),
      )
      .where(
        and(
          eq(FacultySchema.userId, facultyUserId),
          eq(CourseInstructorSchema.courseId, courseId),
          eq(CourseSchema.universityId, UserSchema.universityId),
        ),
      )
      .limit(1);
    return !!row;
  } catch (error) {
    console.error("Error checking course instructor access:", error);
    return false;
  }
}

/**
 * Validates faculty access to a specific course and returns session
 * @param courseId - Course ID to verify access
 * @param semester - Optional semester
 * @returns Session object or NextResponse error
 */
export async function requireCourseInstructor(courseId: string) {
  const sessionOrError = await requireFaculty();

  // If requireFaculty returned an error, pass it through
  if (sessionOrError instanceof NextResponse) {
    return sessionOrError;
  }

  const session = sessionOrError;

  // Verify course access
  const hasAccess = await checkCourseInstructorAccess(
    session.user.id,
    courseId,
  );

  if (!hasAccess) {
    return NextResponse.json(
      { error: "Access denied: Not authorized to teach this course" },
      { status: 403 },
    );
  }

  return session;
}

/**
 * Checks if faculty has specific permissions based on their position
 * @param facultyId - Faculty user ID
 * @param permission - Permission to check ('grade', 'create_assignments', 'manage_course', etc.)
 * @returns Boolean indicating permission
 */
export async function checkFacultyPermissions(
  facultyId: string,
  permission: string,
): Promise<boolean> {
  try {
    const facultyRecord =
      await pgAcademicRepository.getFacultyByUserId(facultyId);
    if (!facultyRecord || !facultyRecord.isActive) return false;

    // Permission mapping based on faculty position
    const permissions = {
      professor: [
        "grade",
        "create_assignments",
        "manage_course",
        "manage_announcements",
        "view_analytics",
      ],
      associate_professor: [
        "grade",
        "create_assignments",
        "manage_course",
        "manage_announcements",
        "view_analytics",
      ],
      assistant_professor: [
        "grade",
        "create_assignments",
        "manage_course",
        "manage_announcements",
        "view_analytics",
      ],
      lecturer: ["grade", "create_assignments", "manage_announcements"],
      instructor: ["grade", "create_assignments"],
      visiting_professor: ["grade", "create_assignments", "manage_course"],
    };

    const positionPermissions =
      permissions[facultyRecord.position as keyof typeof permissions] || [];
    return positionPermissions.includes(permission);
  } catch (error) {
    console.error("Error checking faculty permissions:", error);
    return false;
  }
}

/**
 * Faculty-specific validation for API routes
 * @param request - NextRequest object
 * @returns Session or error response
 */
export async function validateFacultyApiAccess(_request?: Request) {
  return await requireFaculty();
}
