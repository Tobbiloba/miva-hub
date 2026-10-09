import "server-only";
import { pgDb } from "@/lib/db/pg/db.pg";
import { UserSchema } from "@/lib/db/pg/schema.pg";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getApiSession, getSession } from "./server";

/**
 * Check if the current session belongs to an active student.
 * Uses DB role enum + enrollment_status.
 */
export async function isStudent(): Promise<boolean> {
  try {
    const session = await getSession();
    return (
      session?.user?.role === "student" &&
      session?.user?.enrollmentStatus === "active"
    );
  } catch {
    return false;
  }
}

/**
 * Require student access for API routes.
 * Returns session if active student, NextResponse error otherwise.
 */
export async function requireStudent() {
  const session = await getApiSession();

  if (!session?.user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  // Role and enrollment status from the DB, not the cached session payload,
  // so a suspension or role change applies immediately.
  const [userRow] = await pgDb
    .select({
      role: UserSchema.role,
      enrollmentStatus: UserSchema.enrollmentStatus,
    })
    .from(UserSchema)
    .where(eq(UserSchema.id, session.user.id))
    .limit(1);

  if (userRow?.role !== "student") {
    return NextResponse.json(
      { error: "Student access required" },
      { status: 403 },
    );
  }

  if (userRow.enrollmentStatus !== "active") {
    return NextResponse.json(
      {
        error: "Active enrollment required",
        enrollmentStatus: userRow.enrollmentStatus,
      },
      { status: 403 },
    );
  }

  return session;
}

/**
 * Check if a user session belongs to an active student.
 * Works with the session.user object directly.
 */
export function isActiveStudent(session: any): boolean {
  return (
    session?.user?.role === "student" &&
    session?.user?.enrollmentStatus === "active"
  );
}

/**
 * Get student information from session.
 */
export function getStudentInfo(session: any) {
  if (!isActiveStudent(session)) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    studentId: session.user.studentId,
    academicYear: session.user.academicYear,
    enrollmentStatus: session.user.enrollmentStatus,
    role: session.user.role,
  };
}

/**
 * Enrollment status constants
 */
export const ENROLLMENT_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  GRADUATED: "graduated",
  SUSPENDED: "suspended",
  TRANSFERRED: "transferred",
} as const;

export type EnrollmentStatus =
  (typeof ENROLLMENT_STATUS)[keyof typeof ENROLLMENT_STATUS];
