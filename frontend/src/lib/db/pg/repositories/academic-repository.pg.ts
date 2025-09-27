import { eq, and, desc, asc } from "drizzle-orm";
import { pgDb as db } from "../db.pg";
import {
  DepartmentSchema,
  CourseSchema,
  CourseMaterialSchema,
  StudentEnrollmentSchema,
  FacultySchema,
  AnnouncementSchema,
  AcademicCalendarSchema,
  ClassScheduleSchema,
  CourseInstructorSchema,
  type DepartmentEntity,
  type CourseEntity,
  type CourseMaterialEntity,
  type StudentEnrollmentEntity,
  type FacultyEntity,
  type AnnouncementEntity,
  type AcademicCalendarEntity,
  type ClassScheduleEntity,
} from "../schema.pg";

export const pgAcademicRepository = {
  // Department operations
  getDepartments: async (): Promise<DepartmentEntity[]> => {
    return db.select().from(DepartmentSchema).orderBy(asc(DepartmentSchema.name));
  },

  getDepartmentByCode: async (code: string): Promise<DepartmentEntity | null> => {
    const [result] = await db
      .select()
      .from(DepartmentSchema)
      .where(eq(DepartmentSchema.code, code));
    return result ?? null;
  },

  // Course operations
  getCoursesByDepartment: async (departmentId: string): Promise<CourseEntity[]> => {
    return db
      .select()
      .from(CourseSchema)
      .where(and(
        eq(CourseSchema.departmentId, departmentId),
        eq(CourseSchema.isActive, true)
      ))
      .orderBy(asc(CourseSchema.courseCode));
  },

  getCourseByCode: async (courseCode: string): Promise<CourseEntity | null> => {
    const [result] = await db
      .select()
      .from(CourseSchema)
      .where(eq(CourseSchema.courseCode, courseCode));
    return result ?? null;
  },

  getActiveCourses: async (): Promise<CourseEntity[]> => {
    return db
      .select()
      .from(CourseSchema)
      .where(eq(CourseSchema.isActive, true))
      .orderBy(asc(CourseSchema.courseCode));
  },

  // Course materials operations
  getCourseMaterials: async (
    courseId: string,
    weekNumber?: number
  ): Promise<CourseMaterialEntity[]> => {
    const conditions = [eq(CourseMaterialSchema.courseId, courseId)];
    if (weekNumber) {
      conditions.push(eq(CourseMaterialSchema.weekNumber, weekNumber));
    }

    return db
      .select()
      .from(CourseMaterialSchema)
      .where(and(...conditions))
      .orderBy(asc(CourseMaterialSchema.weekNumber), asc(CourseMaterialSchema.createdAt));
  },

  getCourseMaterialsByType: async (
    courseId: string,
    materialType: "syllabus" | "lecture" | "assignment" | "resource" | "reading" | "exam"
  ): Promise<CourseMaterialEntity[]> => {
    return db
      .select()
      .from(CourseMaterialSchema)
      .where(and(
        eq(CourseMaterialSchema.courseId, courseId),
        eq(CourseMaterialSchema.materialType, materialType)
      ))
      .orderBy(asc(CourseMaterialSchema.weekNumber));
  },

  // Student enrollment operations
  getStudentEnrollments: async (
    studentId: string,
    semester?: string
  ): Promise<StudentEnrollmentEntity[]> => {
    const conditions = [eq(StudentEnrollmentSchema.studentId, studentId)];
    if (semester) {
      conditions.push(eq(StudentEnrollmentSchema.semester, semester));
    }

    return db
      .select()
      .from(StudentEnrollmentSchema)
      .where(and(...conditions))
      .orderBy(desc(StudentEnrollmentSchema.enrollmentDate));
  },

  getCourseEnrollments: async (
    courseId: string,
    semester: string
  ): Promise<StudentEnrollmentEntity[]> => {
    return db
      .select()
      .from(StudentEnrollmentSchema)
      .where(and(
        eq(StudentEnrollmentSchema.courseId, courseId),
        eq(StudentEnrollmentSchema.semester, semester)
      ))
      .orderBy(asc(StudentEnrollmentSchema.enrollmentDate));
  },

  // Faculty operations
  getFacultyByDepartment: async (departmentId: string): Promise<FacultyEntity[]> => {
    return db
      .select()
      .from(FacultySchema)
      .where(and(
        eq(FacultySchema.departmentId, departmentId),
        eq(FacultySchema.isActive, true)
      ))
      .orderBy(asc(FacultySchema.position));
  },

  getFacultyByUserId: async (userId: string): Promise<FacultyEntity | null> => {
    const [result] = await db
      .select()
      .from(FacultySchema)
      .where(eq(FacultySchema.userId, userId));
    return result ?? null;
  },

  // Announcements operations
  getAnnouncements: async (
    courseId?: string,
    departmentId?: string,
    limit = 10
  ): Promise<AnnouncementEntity[]> => {
    const conditions = [eq(AnnouncementSchema.isActive, true)];
    
    if (courseId) {
      conditions.push(eq(AnnouncementSchema.courseId, courseId));
    }
    if (departmentId) {
      conditions.push(eq(AnnouncementSchema.departmentId, departmentId));
    }

    return db
      .select()
      .from(AnnouncementSchema)
      .where(and(...conditions))
      .orderBy(desc(AnnouncementSchema.createdAt))
      .limit(limit);
  },

  // Academic calendar operations
  getActiveAcademicCalendar: async (): Promise<AcademicCalendarEntity | null> => {
    const [result] = await db
      .select()
      .from(AcademicCalendarSchema)
      .where(eq(AcademicCalendarSchema.isActive, true));
    return result ?? null;
  },

  getAcademicCalendarBySemester: async (semester: string): Promise<AcademicCalendarEntity | null> => {
    const [result] = await db
      .select()
      .from(AcademicCalendarSchema)
      .where(eq(AcademicCalendarSchema.semester, semester));
    return result ?? null;
  },

  // Class schedule operations
  getCourseSchedule: async (
    courseId: string,
    semester: string
  ): Promise<ClassScheduleEntity[]> => {
    return db
      .select()
      .from(ClassScheduleSchema)
      .where(and(
        eq(ClassScheduleSchema.courseId, courseId),
        eq(ClassScheduleSchema.semester, semester)
      ))
      .orderBy(asc(ClassScheduleSchema.dayOfWeek), asc(ClassScheduleSchema.startTime));
  },

  // Combined operations for complex queries
  getStudentCoursesWithMaterials: async (
    studentId: string,
    semester: string
  ) => {
    // Get student enrollments with course details
    const enrollmentsWithCourses = await db
      .select({
        enrollment: StudentEnrollmentSchema,
        course: CourseSchema,
        department: DepartmentSchema,
      })
      .from(StudentEnrollmentSchema)
      .innerJoin(CourseSchema, eq(StudentEnrollmentSchema.courseId, CourseSchema.id))
      .innerJoin(DepartmentSchema, eq(CourseSchema.departmentId, DepartmentSchema.id))
      .where(and(
        eq(StudentEnrollmentSchema.studentId, studentId),
        eq(StudentEnrollmentSchema.semester, semester)
      ));

    return enrollmentsWithCourses;
  },

  getCourseWithInstructor: async (courseId: string, semester: string) => {
    const courseWithInstructor = await db
      .select({
        course: CourseSchema,
        department: DepartmentSchema,
        instructor: FacultySchema,
        instructorRole: CourseInstructorSchema,
      })
      .from(CourseSchema)
      .innerJoin(DepartmentSchema, eq(CourseSchema.departmentId, DepartmentSchema.id))
      .leftJoin(CourseInstructorSchema, and(
        eq(CourseInstructorSchema.courseId, CourseSchema.id),
        eq(CourseInstructorSchema.semester, semester)
      ))
      .leftJoin(FacultySchema, eq(CourseInstructorSchema.facultyId, FacultySchema.id))
      .where(eq(CourseSchema.id, courseId));

    return courseWithInstructor;
  },
};

export type AcademicRepository = typeof pgAcademicRepository;