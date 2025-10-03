import { NextResponse } from "next/server";
import { getSession } from "./server";
import { getUserRole } from "./user-utils";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";

/**
 * Faculty Authentication and Authorization Helper Functions
 * Provides secure faculty role verification and course access control
 */

/**
 * Validates that the current user is an active faculty member
 * @returns Session object or NextResponse error
 */
export async function requireFaculty() {
  const session = await getSession();
  
  if (!session?.user) {
    return NextResponse.json(
      { error: "Authentication required" }, 
      { status: 401 }
    );
  }
  
  // Check if user has faculty role
  if (getUserRole(session.user) !== "faculty") {
    return NextResponse.json(
      { error: "Faculty access required" }, 
      { status: 403 }
    );
  }
  
  // Check if user has valid MIVA email
  if (!session.user.email?.endsWith("@miva.edu.ng")) {
    return NextResponse.json(
      { error: "Invalid institutional email" }, 
      { status: 403 }
    );
  }
  
  // Verify faculty record exists and is active
  try {
    const facultyRecord = await pgAcademicRepository.getFacultyByUserId(session.user.id);
    
    if (!facultyRecord) {
      return NextResponse.json(
        { error: "Faculty record not found" }, 
        { status: 403 }
      );
    }
    
    if (!facultyRecord.isActive) {
      return NextResponse.json(
        { error: "Faculty account is inactive" }, 
        { status: 403 }
      );
    }
  } catch (error) {
    console.error("Error verifying faculty status:", error);
    return NextResponse.json(
      { error: "Authentication verification failed" }, 
      { status: 500 }
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
  
  const isFaculty = (
    session.user.role === "faculty" &&
    session.user.email?.endsWith("@miva.edu.ng")
  );
  
  if (!isFaculty) return null;
  
  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role,
  };
}

/**
 * Verifies that a faculty member is authorized to teach a specific course
 * @param facultyId - Faculty user ID
 * @param courseId - Course ID to check
 * @param semester - Optional semester (defaults to current)
 * @returns Boolean indicating authorization
 */
export async function checkCourseInstructorAccess(
  facultyId: string, 
  courseId: string, 
  semester?: string
): Promise<boolean> {
  try {
    // Get current semester if not provided
    const currentSemester = semester || await getCurrentSemester();
    
    const courseInstructors = await pgAcademicRepository.getCourseInstructors(
      courseId, 
      currentSemester
    );
    
    // Check if faculty is assigned to this course
    const facultyRecord = await pgAcademicRepository.getFacultyByUserId(facultyId);
    if (!facultyRecord) return false;
    
    return courseInstructors.some(
      instructor => instructor.courseInstructor.facultyId === facultyRecord.id
    );
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
export async function requireCourseInstructor(courseId: string, semester?: string) {
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
    semester
  );
  
  if (!hasAccess) {
    return NextResponse.json(
      { error: "Access denied: Not authorized to teach this course" }, 
      { status: 403 }
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
  permission: string
): Promise<boolean> {
  try {
    const facultyRecord = await pgAcademicRepository.getFacultyByUserId(facultyId);
    if (!facultyRecord || !facultyRecord.isActive) return false;
    
    // Permission mapping based on faculty position
    const permissions = {
      'professor': ['grade', 'create_assignments', 'manage_course', 'manage_announcements', 'view_analytics'],
      'associate_professor': ['grade', 'create_assignments', 'manage_course', 'manage_announcements', 'view_analytics'],
      'assistant_professor': ['grade', 'create_assignments', 'manage_course', 'manage_announcements', 'view_analytics'],
      'lecturer': ['grade', 'create_assignments', 'manage_announcements'],
      'instructor': ['grade', 'create_assignments'],
      'visiting_professor': ['grade', 'create_assignments', 'manage_course']
    };
    
    const positionPermissions = permissions[facultyRecord.position as keyof typeof permissions] || [];
    return positionPermissions.includes(permission);
  } catch (error) {
    console.error("Error checking faculty permissions:", error);
    return false;
  }
}

/**
 * Gets the current active semester
 * @returns Current semester string (e.g., "2025-spring")
 * @deprecated Use getCurrentSemester from @/lib/utils/semester instead
 */
async function getCurrentSemester(): Promise<string> {
  // Import here to avoid circular dependency
  const { getCurrentSemester: getCurrentSemesterUtil } = await import("@/lib/utils/semester");
  return getCurrentSemesterUtil();
}

/**
 * Validates that faculty can access student data (must be enrolled in faculty's course)
 * @param facultyId - Faculty user ID
 * @param studentId - Student user ID
 * @param semester - Optional semester
 * @returns Boolean indicating access permission
 */
export async function checkStudentAccess(
  facultyId: string, 
  studentId: string, 
  semester?: string
): Promise<boolean> {
  try {
    const currentSemester = semester || await getCurrentSemester();
    
    // Get faculty record
    const facultyRecord = await pgAcademicRepository.getFacultyByUserId(facultyId);
    if (!facultyRecord) return false;
    
    // Get faculty's courses
    const facultyCourses = await pgAcademicRepository.getFacultyCourses(
      facultyRecord.id, 
      currentSemester
    );
    
    // Check if student is enrolled in any of faculty's courses
    for (const course of facultyCourses) {
      const enrollments = await pgAcademicRepository.getCourseEnrollments(
        course.course.id, 
        currentSemester
      );
      
      const isEnrolled = enrollments.some(
        enrollment => enrollment.studentId === studentId
      );
      
      if (isEnrolled) return true;
    }
    
    return false;
  } catch (error) {
    console.error("Error checking student access:", error);
    return false;
  }
}

/**
 * Faculty-specific validation for API routes
 * @param request - NextRequest object
 * @returns Session or error response
 */
export async function validateFacultyApiAccess(request?: Request) {
  return await requireFaculty();
}