import "server-only";
import { getSession } from "./server";
import { NextResponse } from "next/server";
import { getUserRole, getEnrollmentStatus } from "./user-utils";

/**
 * Check if the current session belongs to an active student
 * @returns Promise<boolean> - true if user is an active student, false otherwise
 */
export async function isStudent(): Promise<boolean> {
  try {
    const session = await getSession();
    return (
      getUserRole(session?.user) === "student" && 
      getEnrollmentStatus(session?.user) === "active" &&
      session?.user?.email?.endsWith("@miva.edu.ng")
    );
  } catch {
    return false;
  }
}

/**
 * Require student access for API routes
 * @returns Promise<Session | NextResponse> - session if active student, error response if not
 */
export async function requireStudent() {
  try {
    const session = await getSession();
    
    if (!session?.user?.email || !session.user.email.endsWith("@miva.edu.ng")) {
      return NextResponse.json({ error: "MIVA University student access required" }, { status: 403 });
    }
    
    if (getUserRole(session.user) !== "student") {
      return NextResponse.json({ error: "Student access required" }, { status: 403 });
    }
    
    if (getEnrollmentStatus(session.user) !== "active") {
      return NextResponse.json({ 
        error: "Active enrollment required", 
        enrollmentStatus: getEnrollmentStatus(session.user) 
      }, { status: 403 });
    }
    
    return session;
  } catch (error) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
}

/**
 * Check if a user session belongs to an active student
 * @param session - User session to check
 * @returns boolean - true if active student
 */
export function isActiveStudent(session: any): boolean {
  return (
    session?.user?.role === "student" && 
    session?.user?.enrollmentStatus === "active" &&
    session?.user?.email?.endsWith("@miva.edu.ng")
  );
}

/**
 * Get student information from session
 * @param session - User session
 * @returns object with student details or null
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
    role: session.user.role
  };
}

/**
 * Check enrollment status types
 */
export const ENROLLMENT_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive", 
  GRADUATED: "graduated",
  SUSPENDED: "suspended",
  TRANSFERRED: "transferred"
} as const;

export type EnrollmentStatus = typeof ENROLLMENT_STATUS[keyof typeof ENROLLMENT_STATUS];