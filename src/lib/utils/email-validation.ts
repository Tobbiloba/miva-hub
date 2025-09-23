/**
 * Email validation utilities for school-specific authentication
 */

// School domain configuration
const SCHOOL_DOMAIN = '@miva.edu.ng';

export interface EmailValidationResult {
  isValid: boolean;
  error?: string;
}

export interface StudentInfo {
  studentId?: string;
  academicYear: string;
  enrollmentStatus: 'active';
  role: 'student';
}

/**
 * Validates that email uses the school domain
 */
export function validateSchoolEmail(email: string): EmailValidationResult {
  const normalizedEmail = email.toLowerCase().trim();
  
  // Check if email is provided
  if (!normalizedEmail) {
    return {
      isValid: false,
      error: 'Email address is required'
    };
  }
  
  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    return {
      isValid: false,
      error: 'Please enter a valid email address'
    };
  }
  
  // Check school domain
  if (!normalizedEmail.endsWith(SCHOOL_DOMAIN)) {
    return {
      isValid: false,
      error: `Please use your school email address ending with ${SCHOOL_DOMAIN}`
    };
  }
  
  // Additional validation: ensure it's not just the domain
  const localPart = normalizedEmail.split('@')[0];
  if (!localPart || localPart.length < 2) {
    return {
      isValid: false,
      error: 'Invalid email format'
    };
  }
  
  return { isValid: true };
}

/**
 * Extracts student information from school email
 */
export function extractStudentInfo(email: string): StudentInfo {
  const normalizedEmail = email.toLowerCase().trim();
  const emailPrefix = normalizedEmail.split('@')[0];
  
  // Try to extract student ID from email patterns like:
  // - john.doe.123456@school.edu
  // - jdoe123456@school.edu  
  // - 123456@school.edu
  let studentId: string | undefined;
  
  // Pattern 1: ends with 6+ digits after a dot
  const dotNumberMatch = emailPrefix.match(/\.(\d{6,})$/);
  if (dotNumberMatch) {
    studentId = `SID${dotNumberMatch[1]}`;
  }
  
  // Pattern 2: ends with 6+ digits (no dot)
  else {
    const numberMatch = emailPrefix.match(/(\d{6,})$/);
    if (numberMatch) {
      studentId = `SID${numberMatch[1]}`;
    }
  }
  
  // Pattern 3: email is just numbers
  if (/^\d{6,}$/.test(emailPrefix)) {
    studentId = `SID${emailPrefix}`;
  }
  
  return {
    studentId,
    academicYear: getCurrentAcademicYear(),
    enrollmentStatus: 'active',
    role: 'student'
  };
}

/**
 * Gets the current academic year in YYYY-YYYY format
 */
export function getCurrentAcademicYear(): string {
  const now = new Date();
  const currentYear = now.getFullYear();
  const month = now.getMonth() + 1; // 0-indexed, so add 1
  
  // Academic year typically starts in August/September
  // If current month is August (8) or later, we're in the new academic year
  if (month >= 8) {
    return `${currentYear}-${currentYear + 1}`;
  } else {
    return `${currentYear - 1}-${currentYear}`;
  }
}

/**
 * Normalizes email for consistent storage
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Checks if email belongs to faculty/staff based on patterns
 */
export function detectUserRole(email: string): 'student' | 'faculty' | 'staff' {
  const normalizedEmail = email.toLowerCase().trim();
  const localPart = normalizedEmail.split('@')[0];
  
  // Faculty patterns: contain 'prof', 'dr', 'faculty', department names
  const facultyPatterns = [
    /^(prof|dr|professor)/,
    /\.(prof|dr|faculty)$/,
    /^faculty\./,
    /(admin|dean|chair)/
  ];
  
  // Staff patterns: contain 'admin', 'staff', department codes
  const staffPatterns = [
    /^(admin|staff|registrar|bursar)/,
    /\.(admin|staff|office)$/,
    /(library|it|maintenance)/
  ];
  
  // Check faculty patterns
  for (const pattern of facultyPatterns) {
    if (pattern.test(localPart)) {
      return 'faculty';
    }
  }
  
  // Check staff patterns  
  for (const pattern of staffPatterns) {
    if (pattern.test(localPart)) {
      return 'staff';
    }
  }
  
  // Default to student
  return 'student';
}

/**
 * Validates and prepares user data for registration
 */
export function prepareUserRegistrationData(userData: {
  email: string;
  name: string;
  password?: string;
}) {
  // Validate email
  const emailValidation = validateSchoolEmail(userData.email);
  if (!emailValidation.isValid) {
    throw new Error(emailValidation.error);
  }
  
  const normalizedEmail = normalizeEmail(userData.email);
  const studentInfo = extractStudentInfo(normalizedEmail);
  const userRole = detectUserRole(normalizedEmail);
  
  return {
    email: normalizedEmail,
    name: userData.name.trim(),
    password: userData.password,
    // Academic fields
    studentId: studentInfo.studentId,
    role: userRole,
    academicYear: studentInfo.academicYear,
    enrollmentStatus: studentInfo.enrollmentStatus,
  };
}

/**
 * Custom error class for school email validation
 */
export class SchoolEmailValidationError extends Error {
  constructor(message: string, public code: string = 'INVALID_SCHOOL_EMAIL') {
    super(message);
    this.name = 'SchoolEmailValidationError';
  }
}

// Export constants for use in other files
export { SCHOOL_DOMAIN };