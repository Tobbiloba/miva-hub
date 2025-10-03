// Extended User interface with academic fields
export interface ExtendedUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
  
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

// Extended Session interface
export interface ExtendedSession {
  user: ExtendedUser;
  session: {
    id: string;
    userId: string;
    expiresAt: Date;
    token: string;
    createdAt: Date;
    updatedAt: Date;
    ipAddress?: string | null;
    userAgent?: string | null;
  };
}