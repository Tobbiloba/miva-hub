import type { Session, User } from "better-auth/types";

// Extend Better Auth types to include our custom user fields
declare module "better-auth/types" {
  interface User {
    // Academic/Student fields
    studentId?: string | null;
    major?: string | null;
    year?: string | null; // 100, 200, 300, 400, graduate, doctoral
    currentSemester?: string | null; // first, second
    role?: string | null; // student, faculty, admin, staff
    academicYear?: string | null; // 2024-2025, 2025-2026
    enrollmentStatus?: string | null; // active, inactive, graduated, suspended, transferred
    graduationDate?: Date | null;
  }
}