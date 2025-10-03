// Basic user interface type
interface BaseUser {
  id: string;
  name: string;
  email: string;
  [key: string]: any; // Allow additional properties
}

// Extended user interface with all academic fields
export interface ExtendedUser extends BaseUser {
  studentId?: string | null;
  major?: string | null;
  year?: string | null;
  currentSemester?: string | null;
  role?: string | null;
  academicYear?: string | null;
  enrollmentStatus?: string | null;
  graduationDate?: Date | null;
}

// Type guard to check if user has extended properties
export function isExtendedUser(user: BaseUser): user is ExtendedUser {
  return user && typeof user === 'object';
}

// Safely get student ID from user
export function getStudentId(user?: BaseUser | null): string | null {
  return user ? (user as any).studentId || null : null;
}

// Safely get academic year from user
export function getAcademicYear(user?: BaseUser | null): string | null {
  return user ? (user as any).academicYear || null : null;
}

// Safely get user role
export function getUserRole(user?: BaseUser | null): string | null {
  return user ? (user as any).role || null : null;
}

// Safely get enrollment status
export function getEnrollmentStatus(user?: BaseUser | null): string | null {
  return user ? (user as any).enrollmentStatus || null : null;
}

// Safely get user year
export function getUserYear(user?: BaseUser | null): string | null {
  return user ? (user as any).year || null : null;
}

// Safely get current semester
export function getCurrentSemester(user?: BaseUser | null): string | null {
  return user ? (user as any).currentSemester || null : null;
}

// Get complete extended user data
export function getExtendedUser(user?: BaseUser | null): ExtendedUser | null {
  if (!user) return null;
  
  return {
    ...user,
    studentId: getStudentId(user),
    academicYear: getAcademicYear(user),
    role: getUserRole(user),
    enrollmentStatus: getEnrollmentStatus(user),
    year: getUserYear(user),
    currentSemester: getCurrentSemester(user),
    major: (user as any).major || null,
    graduationDate: (user as any).graduationDate || null,
  };
}