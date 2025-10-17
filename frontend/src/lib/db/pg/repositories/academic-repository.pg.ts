import { eq, and, desc, asc, sql } from "drizzle-orm";
import { pgDb as db } from "../db.pg";
import {
  DepartmentSchema,
  CourseSchema,
  CourseWeekSchema,
  CourseMaterialSchema,
  StudentEnrollmentSchema,
  FacultySchema,
  AnnouncementSchema,
  AcademicCalendarSchema,
  ClassScheduleSchema,
  CourseInstructorSchema,
  AssignmentSchema,
  AssignmentSubmissionSchema,
  AIProcessingJobSchema,
  AIProcessedContentSchema,
  ContentEmbeddingSchema,
  UserSchema,
  type DepartmentEntity,
  type CourseEntity,
  type CourseWeekEntity,
  type CourseMaterialEntity,
  type StudentEnrollmentEntity,
  type FacultyEntity,
  type AnnouncementEntity,
  type AcademicCalendarEntity,
  type ClassScheduleEntity,
  type AIProcessingJobEntity,
  type AIProcessedContentEntity,
  type ContentEmbeddingEntity,
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

  getDepartmentById: async (departmentId: string): Promise<DepartmentEntity | null> => {
    const [result] = await db
      .select()
      .from(DepartmentSchema)
      .where(eq(DepartmentSchema.id, departmentId));
    return result ?? null;
  },

  createDepartment: async (departmentData: Omit<typeof DepartmentSchema.$inferInsert, 'id' | 'createdAt' | 'updatedAt'>): Promise<DepartmentEntity> => {
    const [insertedDepartment] = await db
      .insert(DepartmentSchema)
      .values({
        ...departmentData,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return insertedDepartment;
  },

  updateDepartment: async (departmentId: string, updates: Partial<typeof DepartmentSchema.$inferInsert>): Promise<DepartmentEntity | null> => {
    const [updatedDepartment] = await db
      .update(DepartmentSchema)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(DepartmentSchema.id, departmentId))
      .returning();
    return updatedDepartment ?? null;
  },

  deleteDepartment: async (departmentId: string): Promise<boolean> => {
    const result = await db
      .delete(DepartmentSchema)
      .where(eq(DepartmentSchema.id, departmentId));
    return result.rowCount > 0;
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

  getCourseById: async (courseId: string): Promise<CourseEntity | null> => {
    const [result] = await db
      .select()
      .from(CourseSchema)
      .where(eq(CourseSchema.id, courseId));
    return result ?? null;
  },

  createCourse: async (courseData: Omit<typeof CourseSchema.$inferInsert, 'id' | 'createdAt' | 'updatedAt'>): Promise<CourseEntity> => {
    const [insertedCourse] = await db
      .insert(CourseSchema)
      .values({
        ...courseData,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return insertedCourse;
  },

  updateCourse: async (courseId: string, updates: Partial<typeof CourseSchema.$inferInsert>): Promise<CourseEntity | null> => {
    const [updatedCourse] = await db
      .update(CourseSchema)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(CourseSchema.id, courseId))
      .returning();
    return updatedCourse ?? null;
  },

  deleteCourse: async (courseId: string): Promise<boolean> => {
    const result = await db
      .delete(CourseSchema)
      .where(eq(CourseSchema.id, courseId));
    return result.rowCount > 0;
  },

  getAllCourses: async (): Promise<CourseEntity[]> => {
    return db
      .select()
      .from(CourseSchema)
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

  getAllCourseMaterials: async (): Promise<CourseMaterialEntity[]> => {
    return db
      .select()
      .from(CourseMaterialSchema)
      .orderBy(desc(CourseMaterialSchema.createdAt));
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

  // Course material insertion
  insertCourseMaterial: async (materialData: typeof CourseMaterialSchema.$inferInsert): Promise<CourseMaterialEntity> => {
    const [result] = await db
      .insert(CourseMaterialSchema)
      .values(materialData)
      .returning();
    return result;
  },

  getCourseMaterialById: async (materialId: string): Promise<CourseMaterialEntity | null> => {
    const [result] = await db
      .select()
      .from(CourseMaterialSchema)
      .where(eq(CourseMaterialSchema.id, materialId));
    return result ?? null;
  },

  updateCourseMaterial: async (materialId: string, updates: Partial<typeof CourseMaterialSchema.$inferInsert>): Promise<CourseMaterialEntity | null> => {
    const [result] = await db
      .update(CourseMaterialSchema)
      .set(updates)
      .where(eq(CourseMaterialSchema.id, materialId))
      .returning();
    return result ?? null;
  },

  deleteCourseMaterial: async (materialId: string): Promise<boolean> => {
    const result = await db
      .delete(CourseMaterialSchema)
      .where(eq(CourseMaterialSchema.id, materialId));
    
    return result.rowCount > 0;
  },

  getCourseMaterialsByWeek: async (courseId: string, weekNumber: number): Promise<CourseMaterialEntity[]> => {
    return db
      .select()
      .from(CourseMaterialSchema)
      .where(
        and(
          eq(CourseMaterialSchema.courseId, courseId),
          eq(CourseMaterialSchema.weekNumber, weekNumber)
        )
      )
      .orderBy(desc(CourseMaterialSchema.uploadedAt));
  },

  // AI Processing operations
  createAIProcessingJob: async (jobData: typeof AIProcessingJobSchema.$inferInsert): Promise<AIProcessingJobEntity> => {
    const [result] = await db
      .insert(AIProcessingJobSchema)
      .values(jobData)
      .returning();
    return result;
  },

  updateAIProcessingJobStatus: async (
    jobId: string, 
    status: "pending" | "processing" | "completed" | "failed",
    startedAt?: Date,
    completedAt?: Date,
    errorMessage?: string
  ): Promise<AIProcessingJobEntity | null> => {
    const updateData: any = { status, updatedAt: new Date() };
    if (startedAt) updateData.startedAt = startedAt;
    if (completedAt) updateData.completedAt = completedAt;
    if (errorMessage) updateData.errorMessage = errorMessage;

    const [result] = await db
      .update(AIProcessingJobSchema)
      .set(updateData)
      .where(eq(AIProcessingJobSchema.id, jobId))
      .returning();
    return result ?? null;
  },

  getAIProcessingJob: async (jobId: string): Promise<AIProcessingJobEntity | null> => {
    const [result] = await db
      .select()
      .from(AIProcessingJobSchema)
      .where(eq(AIProcessingJobSchema.id, jobId));
    return result ?? null;
  },

  insertAIProcessedContent: async (contentData: typeof AIProcessedContentSchema.$inferInsert): Promise<AIProcessedContentEntity> => {
    const [result] = await db
      .insert(AIProcessedContentSchema)
      .values(contentData)
      .returning();
    return result;
  },

  getAIProcessedContent: async (courseMaterialId: string): Promise<AIProcessedContentEntity | null> => {
    const [result] = await db
      .select()
      .from(AIProcessedContentSchema)
      .where(eq(AIProcessedContentSchema.courseMaterialId, courseMaterialId));
    return result ?? null;
  },

  insertContentEmbeddings: async (embeddingsData: (typeof ContentEmbeddingSchema.$inferInsert)[]): Promise<ContentEmbeddingEntity[]> => {
    if (embeddingsData.length === 0) return [];
    
    const results = await db
      .insert(ContentEmbeddingSchema)
      .values(embeddingsData)
      .returning();
    return results;
  },

  getContentEmbeddings: async (courseMaterialId: string): Promise<ContentEmbeddingEntity[]> => {
    return db
      .select()
      .from(ContentEmbeddingSchema)
      .where(eq(ContentEmbeddingSchema.courseMaterialId, courseMaterialId))
      .orderBy(asc(ContentEmbeddingSchema.chunkIndex));
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

  // Admin dashboard statistics
  getSystemStats: async () => {
    try {
      const [studentCount, courseCount, departmentCount, materialCount, facultyCount] = await Promise.all([
        db.select({ count: sql`count(*)` }).from(UserSchema).where(eq(UserSchema.role, 'student')),
        db.select({ count: sql`count(*)` }).from(CourseSchema).where(eq(CourseSchema.isActive, true)),
        db.select({ count: sql`count(*)` }).from(DepartmentSchema),
        db.select({ count: sql`count(*)` }).from(CourseMaterialSchema),
        db.select({ count: sql`count(*)` }).from(FacultySchema).where(eq(FacultySchema.isActive, true))
      ]);
      
      return {
        students: Number(studentCount[0]?.count) || 0,
        courses: Number(courseCount[0]?.count) || 0,
        departments: Number(departmentCount[0]?.count) || 0,
        materials: Number(materialCount[0]?.count) || 0,
        faculty: Number(facultyCount[0]?.count) || 0
      };
    } catch (error) {
      console.error('Error fetching system stats:', error);
      return {
        students: 0,
        courses: 0,
        departments: 0,
        materials: 0,
        faculty: 0
      };
    }
  },

  // Student-specific queries
  getStudentEnrollmentStats: async (studentId: string) => {
    try {
      const [enrollments, totalCredits] = await Promise.all([
        db.select({ count: sql`count(*)` })
          .from(StudentEnrollmentSchema)
          .where(and(
            eq(StudentEnrollmentSchema.studentId, studentId),
            eq(StudentEnrollmentSchema.status, "enrolled")
          )),
        db.select({ 
          totalCredits: sql`sum(${CourseSchema.credits})`.as('totalCredits')
        })
          .from(StudentEnrollmentSchema)
          .innerJoin(CourseSchema, eq(StudentEnrollmentSchema.courseId, CourseSchema.id))
          .where(and(
            eq(StudentEnrollmentSchema.studentId, studentId),
            eq(StudentEnrollmentSchema.status, "enrolled")
          ))
      ]);
      
      return {
        enrolledCourses: Number(enrollments[0]?.count) || 0,
        totalCredits: Number(totalCredits[0]?.totalCredits) || 0,
      };
    } catch (error) {
      console.error('Error fetching student enrollment stats:', error);
      return { enrolledCourses: 0, totalCredits: 0 };
    }
  },

  getStudentCourses: async (studentId: string, semester?: string) => {
    try {
      const conditions = [
        eq(StudentEnrollmentSchema.studentId, studentId),
        eq(StudentEnrollmentSchema.status, "enrolled")
      ];
      
      if (semester) {
        conditions.push(eq(StudentEnrollmentSchema.semester, semester));
      }

      const coursesWithDetails = await db
        .select({
          enrollment: StudentEnrollmentSchema,
          course: CourseSchema,
          department: DepartmentSchema,
        })
        .from(StudentEnrollmentSchema)
        .innerJoin(CourseSchema, eq(StudentEnrollmentSchema.courseId, CourseSchema.id))
        .innerJoin(DepartmentSchema, eq(CourseSchema.departmentId, DepartmentSchema.id))
        .where(and(...conditions))
        .orderBy(asc(CourseSchema.courseCode));

      return coursesWithDetails;
    } catch (error) {
      console.error('Error fetching student courses:', error);
      return [];
    }
  },

  getStudentUpcomingAssignments: async (studentId: string, limit = 5) => {
    try {
      const upcomingAssignments = await db
        .select({
          assignment: AssignmentSchema,
          course: CourseSchema,
          submission: AssignmentSubmissionSchema,
        })
        .from(AssignmentSchema)
        .innerJoin(CourseSchema, eq(AssignmentSchema.courseId, CourseSchema.id))
        .innerJoin(
          StudentEnrollmentSchema, 
          and(
            eq(StudentEnrollmentSchema.courseId, CourseSchema.id),
            eq(StudentEnrollmentSchema.studentId, studentId),
            eq(StudentEnrollmentSchema.status, "enrolled")
          )
        )
        .leftJoin(
          AssignmentSubmissionSchema, 
          and(
            eq(AssignmentSubmissionSchema.assignmentId, AssignmentSchema.id),
            eq(AssignmentSubmissionSchema.studentId, studentId)
          )
        )
        .where(and(
          eq(AssignmentSchema.isPublished, true),
          sql`${AssignmentSchema.dueDate} > CURRENT_TIMESTAMP`
        ))
        .orderBy(asc(AssignmentSchema.dueDate))
        .limit(limit);

      return upcomingAssignments;
    } catch (error) {
      console.error('Error fetching upcoming assignments:', error);
      return [];
    }
  },

  getStudentGradesSummary: async (studentId: string, semester?: string) => {
    try {
      const conditions = [
        eq(AssignmentSubmissionSchema.studentId, studentId),
        sql`${AssignmentSubmissionSchema.grade} IS NOT NULL`
      ];

      if (semester) {
        conditions.push(eq(StudentEnrollmentSchema.semester, semester));
      }

      const grades = await db
        .select({
          assignment: AssignmentSchema,
          course: CourseSchema,
          submission: AssignmentSubmissionSchema,
        })
        .from(AssignmentSubmissionSchema)
        .innerJoin(AssignmentSchema, eq(AssignmentSubmissionSchema.assignmentId, AssignmentSchema.id))
        .innerJoin(CourseSchema, eq(AssignmentSchema.courseId, CourseSchema.id))
        .innerJoin(
          StudentEnrollmentSchema,
          and(
            eq(StudentEnrollmentSchema.courseId, CourseSchema.id),
            eq(StudentEnrollmentSchema.studentId, studentId)
          )
        )
        .where(and(...conditions))
        .orderBy(desc(AssignmentSubmissionSchema.submittedAt));

      return grades;
    } catch (error) {
      console.error('Error fetching student grades:', error);
      return [];
    }
  },

  getStudentRecentAnnouncements: async (studentId: string, limit = 5) => {
    try {
      const announcements = await db
        .select({
          announcement: AnnouncementSchema,
          course: CourseSchema,
        })
        .from(AnnouncementSchema)
        .leftJoin(CourseSchema, eq(AnnouncementSchema.courseId, CourseSchema.id))
        .leftJoin(
          StudentEnrollmentSchema,
          and(
            eq(StudentEnrollmentSchema.courseId, CourseSchema.id),
            eq(StudentEnrollmentSchema.studentId, studentId),
            eq(StudentEnrollmentSchema.status, "enrolled")
          )
        )
        .where(and(
          eq(AnnouncementSchema.isActive, true),
          sql`(${AnnouncementSchema.targetAudience} = 'all' OR 
               ${AnnouncementSchema.targetAudience} = 'students' OR 
               ${AnnouncementSchema.courseId} IS NOT NULL)`
        ))
        .orderBy(desc(AnnouncementSchema.createdAt))
        .limit(limit);

      return announcements;
    } catch (error) {
      console.error('Error fetching student announcements:', error);
      return [];
    }
  },

  // Faculty-specific operations for Phase 3
  getFacultyCourses: async (facultyId: string, semester?: string) => {
    try {
      const conditions = [eq(CourseInstructorSchema.facultyId, facultyId)];
      if (semester) {
        conditions.push(eq(CourseInstructorSchema.semester, semester));
      }

      const facultyCourses = await db
        .select({
          courseInstructor: CourseInstructorSchema,
          course: CourseSchema,
          department: DepartmentSchema,
        })
        .from(CourseInstructorSchema)
        .innerJoin(CourseSchema, eq(CourseInstructorSchema.courseId, CourseSchema.id))
        .innerJoin(DepartmentSchema, eq(CourseSchema.departmentId, DepartmentSchema.id))
        .where(and(...conditions))
        .orderBy(asc(CourseSchema.courseCode));

      return facultyCourses;
    } catch (error) {
      console.error('Error fetching faculty courses:', error);
      return [];
    }
  },

  getCourseInstructors: async (courseId: string, semester: string) => {
    try {
      const instructors = await db
        .select({
          courseInstructor: CourseInstructorSchema,
          faculty: FacultySchema,
          user: UserSchema,
        })
        .from(CourseInstructorSchema)
        .innerJoin(FacultySchema, eq(CourseInstructorSchema.facultyId, FacultySchema.id))
        .innerJoin(UserSchema, eq(FacultySchema.userId, UserSchema.id))
        .where(and(
          eq(CourseInstructorSchema.courseId, courseId),
          eq(CourseInstructorSchema.semester, semester)
        ))
        .orderBy(asc(CourseInstructorSchema.role));

      return instructors;
    } catch (error) {
      console.error('Error fetching course instructors:', error);
      return [];
    }
  },

  getFacultyAssignments: async (facultyId: string, courseId?: string) => {
    try {
      // First get faculty's courses
      const facultyCourses = await db
        .select({ courseId: CourseInstructorSchema.courseId })
        .from(CourseInstructorSchema)
        .where(eq(CourseInstructorSchema.facultyId, facultyId));

      const courseIds = facultyCourses.map(fc => fc.courseId);
      
      if (courseIds.length === 0) return [];

      const conditions = [
        sql`${AssignmentSchema.courseId} IN (${sql.join(courseIds.map(id => sql`${id}`), sql`, `)})`
      ];

      if (courseId) {
        conditions.push(eq(AssignmentSchema.courseId, courseId));
      }

      const assignments = await db
        .select({
          assignment: AssignmentSchema,
          course: CourseSchema,
        })
        .from(AssignmentSchema)
        .innerJoin(CourseSchema, eq(AssignmentSchema.courseId, CourseSchema.id))
        .where(and(...conditions))
        .orderBy(desc(AssignmentSchema.dueDate));

      return assignments;
    } catch (error) {
      console.error('Error fetching faculty assignments:', error);
      return [];
    }
  },

  getFacultyGradingQueue: async (facultyId: string, limit = 20) => {
    try {
      // Get faculty's courses
      const facultyCourses = await db
        .select({ courseId: CourseInstructorSchema.courseId })
        .from(CourseInstructorSchema)
        .where(eq(CourseInstructorSchema.facultyId, facultyId));

      const courseIds = facultyCourses.map(fc => fc.courseId);
      
      if (courseIds.length === 0) return [];

      const pendingGrades = await db
        .select({
          submission: AssignmentSubmissionSchema,
          assignment: AssignmentSchema,
          course: CourseSchema,
          student: UserSchema,
        })
        .from(AssignmentSubmissionSchema)
        .innerJoin(AssignmentSchema, eq(AssignmentSubmissionSchema.assignmentId, AssignmentSchema.id))
        .innerJoin(CourseSchema, eq(AssignmentSchema.courseId, CourseSchema.id))
        .innerJoin(UserSchema, eq(AssignmentSubmissionSchema.studentId, UserSchema.id))
        .where(and(
          sql`${AssignmentSchema.courseId} IN (${sql.join(courseIds.map(id => sql`${id}`), sql`, `)})`,
          sql`${AssignmentSubmissionSchema.grade} IS NULL`
        ))
        .orderBy(asc(AssignmentSubmissionSchema.submittedAt))
        .limit(limit);

      return pendingGrades;
    } catch (error) {
      console.error('Error fetching faculty grading queue:', error);
      return [];
    }
  },

  getFacultyStudents: async (facultyId: string, courseId?: string, semester?: string) => {
    try {
      // Get faculty's courses
      let courseIds: string[];
      
      if (courseId) {
        // Verify faculty teaches this course
        const courseAccess = await db
          .select({ courseId: CourseInstructorSchema.courseId })
          .from(CourseInstructorSchema)
          .where(and(
            eq(CourseInstructorSchema.facultyId, facultyId),
            eq(CourseInstructorSchema.courseId, courseId)
          ));
        
        courseIds = courseAccess.map(ca => ca.courseId);
      } else {
        const facultyCourses = await db
          .select({ courseId: CourseInstructorSchema.courseId })
          .from(CourseInstructorSchema)
          .where(eq(CourseInstructorSchema.facultyId, facultyId));
        
        courseIds = facultyCourses.map(fc => fc.courseId);
      }

      if (courseIds.length === 0) return [];

      const conditions = [
        sql`${StudentEnrollmentSchema.courseId} IN (${sql.join(courseIds.map(id => sql`${id}`), sql`, `)})`,
        eq(StudentEnrollmentSchema.status, "enrolled")
      ];

      if (semester) {
        conditions.push(eq(StudentEnrollmentSchema.semester, semester));
      }

      const students = await db
        .select({
          enrollment: StudentEnrollmentSchema,
          student: UserSchema,
          course: CourseSchema,
        })
        .from(StudentEnrollmentSchema)
        .innerJoin(UserSchema, eq(StudentEnrollmentSchema.studentId, UserSchema.id))
        .innerJoin(CourseSchema, eq(StudentEnrollmentSchema.courseId, CourseSchema.id))
        .where(and(...conditions))
        .orderBy(asc(UserSchema.name));

      return students;
    } catch (error) {
      console.error('Error fetching faculty students:', error);
      return [];
    }
  },

  getFacultyDashboardStats: async (facultyId: string) => {
    try {
      // Get faculty's courses
      const facultyCourses = await db
        .select({ courseId: CourseInstructorSchema.courseId })
        .from(CourseInstructorSchema)
        .where(eq(CourseInstructorSchema.facultyId, facultyId));

      const courseIds = facultyCourses.map(fc => fc.courseId);
      
      if (courseIds.length === 0) {
        return {
          activeCourses: 0,
          totalStudents: 0,
          pendingGrades: 0,
          recentSubmissions: 0
        };
      }

      const [totalStudents, pendingGrades, recentSubmissions] = await Promise.all([
        // Total enrolled students across all courses
        db.select({ count: sql`count(*)` })
          .from(StudentEnrollmentSchema)
          .where(and(
            sql`${StudentEnrollmentSchema.courseId} IN (${sql.join(courseIds.map(id => sql`${id}`), sql`, `)})`,
            eq(StudentEnrollmentSchema.status, "enrolled")
          )),
        
        // Pending grades count
        db.select({ count: sql`count(*)` })
          .from(AssignmentSubmissionSchema)
          .innerJoin(AssignmentSchema, eq(AssignmentSubmissionSchema.assignmentId, AssignmentSchema.id))
          .where(and(
            sql`${AssignmentSchema.courseId} IN (${sql.join(courseIds.map(id => sql`${id}`), sql`, `)})`,
            sql`${AssignmentSubmissionSchema.grade} IS NULL`
          )),
        
        // Recent submissions (last 7 days)
        db.select({ count: sql`count(*)` })
          .from(AssignmentSubmissionSchema)
          .innerJoin(AssignmentSchema, eq(AssignmentSubmissionSchema.assignmentId, AssignmentSchema.id))
          .where(and(
            sql`${AssignmentSchema.courseId} IN (${sql.join(courseIds.map(id => sql`${id}`), sql`, `)})`,
            sql`${AssignmentSubmissionSchema.submittedAt} >= CURRENT_DATE - INTERVAL '7 days'`
          ))
      ]);

      return {
        activeCourses: courseIds.length,
        totalStudents: Number(totalStudents[0]?.count) || 0,
        pendingGrades: Number(pendingGrades[0]?.count) || 0,
        recentSubmissions: Number(recentSubmissions[0]?.count) || 0
      };
    } catch (error) {
      console.error('Error fetching faculty dashboard stats:', error);
      return {
        activeCourses: 0,
        totalStudents: 0,
        pendingGrades: 0,
        recentSubmissions: 0
      };
    }
  },

  getCourseStatistics: async (courseId: string, semester: string) => {
    try {
      const [enrollmentCount, assignmentCount, averageGrade] = await Promise.all([
        // Total enrolled students
        db.select({ count: sql`count(*)` })
          .from(StudentEnrollmentSchema)
          .where(and(
            eq(StudentEnrollmentSchema.courseId, courseId),
            eq(StudentEnrollmentSchema.semester, semester),
            eq(StudentEnrollmentSchema.status, "enrolled")
          )),
        
        // Total assignments
        db.select({ count: sql`count(*)` })
          .from(AssignmentSchema)
          .where(and(
            eq(AssignmentSchema.courseId, courseId),
            eq(AssignmentSchema.isPublished, true)
          )),
        
        // Average grade
        db.select({ 
          avgGrade: sql`AVG(CAST(${AssignmentSubmissionSchema.grade} AS DECIMAL))`.as('avgGrade')
        })
          .from(AssignmentSubmissionSchema)
          .innerJoin(AssignmentSchema, eq(AssignmentSubmissionSchema.assignmentId, AssignmentSchema.id))
          .where(and(
            eq(AssignmentSchema.courseId, courseId),
            sql`${AssignmentSubmissionSchema.grade} IS NOT NULL`
          ))
      ]);

      return {
        enrolledStudents: Number(enrollmentCount[0]?.count) || 0,
        totalAssignments: Number(assignmentCount[0]?.count) || 0,
        averageGrade: Number(averageGrade[0]?.avgGrade) || 0,
        submissionRate: 0 // Would need more complex calculation
      };
    } catch (error) {
      console.error('Error fetching course statistics:', error);
      return {
        enrolledStudents: 0,
        totalAssignments: 0,
        averageGrade: 0,
        submissionRate: 0
      };
    }
  },

  // Grading functions
  getAssignmentSubmissions: async (assignmentId: string, facultyId?: string) => {
    try {
      let query = db
        .select({
          submission: AssignmentSubmissionSchema,
          student: UserSchema,
          assignment: AssignmentSchema,
          course: CourseSchema,
        })
        .from(AssignmentSubmissionSchema)
        .innerJoin(UserSchema, eq(AssignmentSubmissionSchema.studentId, UserSchema.id))
        .innerJoin(AssignmentSchema, eq(AssignmentSubmissionSchema.assignmentId, AssignmentSchema.id))
        .innerJoin(CourseSchema, eq(AssignmentSchema.courseId, CourseSchema.id))
        .where(eq(AssignmentSubmissionSchema.assignmentId, assignmentId));

      // If facultyId provided, verify access
      if (facultyId) {
        query = query
          .innerJoin(CourseInstructorSchema, eq(CourseSchema.id, CourseInstructorSchema.courseId));
        
        query = db
          .select({
            submission: AssignmentSubmissionSchema,
            student: UserSchema,
            assignment: AssignmentSchema,
            course: CourseSchema,
          })
          .from(AssignmentSubmissionSchema)
          .innerJoin(UserSchema, eq(AssignmentSubmissionSchema.studentId, UserSchema.id))
          .innerJoin(AssignmentSchema, eq(AssignmentSubmissionSchema.assignmentId, AssignmentSchema.id))
          .innerJoin(CourseSchema, eq(AssignmentSchema.courseId, CourseSchema.id))
          .innerJoin(CourseInstructorSchema, eq(CourseSchema.id, CourseInstructorSchema.courseId))
          .where(and(
            eq(AssignmentSubmissionSchema.assignmentId, assignmentId),
            eq(CourseInstructorSchema.facultyId, facultyId)
          ));
      }

      const submissions = await query.orderBy(asc(AssignmentSubmissionSchema.submittedAt));
      return submissions;
    } catch (error) {
      console.error('Error fetching assignment submissions:', error);
      return [];
    }
  },

  updateSubmissionGrade: async (submissionId: string, grade: number, feedback?: string, gradedById?: string) => {
    try {
      const updatedSubmission = await db
        .update(AssignmentSubmissionSchema)
        .set({
          grade: grade.toString(),
          feedback,
          gradedAt: new Date(),
          gradedById,
          updatedAt: new Date(),
        })
        .where(eq(AssignmentSubmissionSchema.id, submissionId))
        .returning();

      return updatedSubmission[0] || null;
    } catch (error) {
      console.error('Error updating submission grade:', error);
      return null;
    }
  },

  getCourseGradebook: async (courseId: string, facultyId?: string) => {
    try {
      // Verify faculty access if provided
      if (facultyId) {
        const hasAccess = await db
          .select({ id: CourseInstructorSchema.id })
          .from(CourseInstructorSchema)
          .where(and(
            eq(CourseInstructorSchema.courseId, courseId),
            eq(CourseInstructorSchema.facultyId, facultyId)
          ));

        if (hasAccess.length === 0) {
          throw new Error('Faculty does not have access to this course');
        }
      }

      // Get all students enrolled in the course
      const enrollments = await db
        .select({
          student: UserSchema,
          enrollment: StudentEnrollmentSchema,
        })
        .from(StudentEnrollmentSchema)
        .innerJoin(UserSchema, eq(StudentEnrollmentSchema.studentId, UserSchema.id))
        .where(and(
          eq(StudentEnrollmentSchema.courseId, courseId),
          eq(StudentEnrollmentSchema.status, "enrolled")
        ))
        .orderBy(UserSchema.name);

      // Get all assignments for the course
      const assignments = await db
        .select()
        .from(AssignmentSchema)
        .where(and(
          eq(AssignmentSchema.courseId, courseId),
          eq(AssignmentSchema.isPublished, true)
        ))
        .orderBy(asc(AssignmentSchema.dueDate));

      // Get all submissions for these assignments
      const submissions = await db
        .select({
          submission: AssignmentSubmissionSchema,
          assignment: AssignmentSchema,
        })
        .from(AssignmentSubmissionSchema)
        .innerJoin(AssignmentSchema, eq(AssignmentSubmissionSchema.assignmentId, AssignmentSchema.id))
        .where(eq(AssignmentSchema.courseId, courseId));

      // Organize submissions by student and assignment
      const submissionMap = new Map<string, Map<string, typeof submissions[0]>>();
      
      submissions.forEach(sub => {
        const studentId = sub.submission.studentId;
        const assignmentId = sub.assignment.id;
        
        if (!submissionMap.has(studentId)) {
          submissionMap.set(studentId, new Map());
        }
        
        submissionMap.get(studentId)!.set(assignmentId, sub);
      });

      return {
        students: enrollments,
        assignments,
        submissions: submissionMap,
      };
    } catch (error) {
      console.error('Error fetching course gradebook:', error);
      return {
        students: [],
        assignments: [],
        submissions: new Map(),
      };
    }
  },

  getSubmissionDetails: async (submissionId: string, facultyId?: string) => {
    try {
      let query = db
        .select({
          submission: AssignmentSubmissionSchema,
          student: UserSchema,
          assignment: AssignmentSchema,
          course: CourseSchema,
        })
        .from(AssignmentSubmissionSchema)
        .innerJoin(UserSchema, eq(AssignmentSubmissionSchema.studentId, UserSchema.id))
        .innerJoin(AssignmentSchema, eq(AssignmentSubmissionSchema.assignmentId, AssignmentSchema.id))
        .innerJoin(CourseSchema, eq(AssignmentSchema.courseId, CourseSchema.id))
        .where(eq(AssignmentSubmissionSchema.id, submissionId));

      // If facultyId provided, verify access
      if (facultyId) {
        query = db
          .select({
            submission: AssignmentSubmissionSchema,
            student: UserSchema,
            assignment: AssignmentSchema,
            course: CourseSchema,
          })
          .from(AssignmentSubmissionSchema)
          .innerJoin(UserSchema, eq(AssignmentSubmissionSchema.studentId, UserSchema.id))
          .innerJoin(AssignmentSchema, eq(AssignmentSubmissionSchema.assignmentId, AssignmentSchema.id))
          .innerJoin(CourseSchema, eq(AssignmentSchema.courseId, CourseSchema.id))
          .innerJoin(CourseInstructorSchema, eq(CourseSchema.id, CourseInstructorSchema.courseId))
          .where(and(
            eq(AssignmentSubmissionSchema.id, submissionId),
            eq(CourseInstructorSchema.facultyId, facultyId)
          ));
      }

      const result = await query;
      return result[0] || null;
    } catch (error) {
      console.error('Error fetching submission details:', error);
      return null;
    }
  },

  getAssignmentStatistics: async (assignmentId: string) => {
    try {
      const [submissionStats, enrollmentStats] = await Promise.all([
        // Get submission statistics
        db
          .select({
            totalSubmissions: sql`count(*)`.as('totalSubmissions'),
            gradedSubmissions: sql`count(case when ${AssignmentSubmissionSchema.grade} is not null then 1 end)`.as('gradedSubmissions'),
            pendingSubmissions: sql`count(case when ${AssignmentSubmissionSchema.grade} is null then 1 end)`.as('pendingSubmissions'),
            lateSubmissions: sql`count(case when ${AssignmentSubmissionSchema.isLateSubmission} = true then 1 end)`.as('lateSubmissions'),
            averageGrade: sql`avg(cast(${AssignmentSubmissionSchema.grade} as decimal))`.as('averageGrade'),
          })
          .from(AssignmentSubmissionSchema)
          .where(eq(AssignmentSubmissionSchema.assignmentId, assignmentId)),

        // Get course enrollment count to calculate submission rate
        db
          .select({
            enrolledStudents: sql`count(*)`.as('enrolledStudents')
          })
          .from(StudentEnrollmentSchema)
          .innerJoin(AssignmentSchema, eq(StudentEnrollmentSchema.courseId, AssignmentSchema.courseId))
          .where(and(
            eq(AssignmentSchema.id, assignmentId),
            eq(StudentEnrollmentSchema.status, "enrolled")
          ))
      ]);

      const submissionData = submissionStats[0];
      const enrollmentData = enrollmentStats[0];

      return {
        totalSubmissions: Number(submissionData?.totalSubmissions) || 0,
        gradedSubmissions: Number(submissionData?.gradedSubmissions) || 0,
        pendingSubmissions: Number(submissionData?.pendingSubmissions) || 0,
        lateSubmissions: Number(submissionData?.lateSubmissions) || 0,
        averageGrade: Number(submissionData?.averageGrade) || 0,
        enrolledStudents: Number(enrollmentData?.enrolledStudents) || 0,
        submissionRate: enrollmentData?.enrolledStudents ? 
          (Number(submissionData?.totalSubmissions) / Number(enrollmentData.enrolledStudents)) * 100 : 0,
      };
    } catch (error) {
      console.error('Error fetching assignment statistics:', error);
      return {
        totalSubmissions: 0,
        gradedSubmissions: 0,
        pendingSubmissions: 0,
        lateSubmissions: 0,
        averageGrade: 0,
        enrolledStudents: 0,
        submissionRate: 0,
      };
    }
  },

  getFacultyAssignmentsWithStatistics: async (facultyId: string, courseId?: string) => {
    try {
      // Get faculty's courses
      let courseIds: string[];
      
      if (courseId) {
        // Verify faculty teaches this course
        const courseAccess = await db
          .select({ courseId: CourseInstructorSchema.courseId })
          .from(CourseInstructorSchema)
          .where(and(
            eq(CourseInstructorSchema.facultyId, facultyId),
            eq(CourseInstructorSchema.courseId, courseId)
          ));
        
        courseIds = courseAccess.map(ca => ca.courseId);
      } else {
        const facultyCourses = await db
          .select({ courseId: CourseInstructorSchema.courseId })
          .from(CourseInstructorSchema)
          .where(eq(CourseInstructorSchema.facultyId, facultyId));
        
        courseIds = facultyCourses.map(fc => fc.courseId);
      }

      if (courseIds.length === 0) return [];

      // Get assignments with submission statistics
      const assignments = await db
        .select({
          assignment: AssignmentSchema,
          course: CourseSchema,
          submissionStats: {
            totalSubmissions: sql`count(${AssignmentSubmissionSchema.id})`.as('totalSubmissions'),
            gradedSubmissions: sql`count(case when ${AssignmentSubmissionSchema.grade} is not null then 1 end)`.as('gradedSubmissions'),
            pendingSubmissions: sql`count(case when ${AssignmentSubmissionSchema.grade} is null then 1 end)`.as('pendingSubmissions'),
          }
        })
        .from(AssignmentSchema)
        .innerJoin(CourseSchema, eq(AssignmentSchema.courseId, CourseSchema.id))
        .leftJoin(AssignmentSubmissionSchema, eq(AssignmentSchema.id, AssignmentSubmissionSchema.assignmentId))
        .where(sql`${AssignmentSchema.courseId} IN (${sql.join(courseIds.map(id => sql`${id}`), sql`, `)})`)
        .groupBy(AssignmentSchema.id, CourseSchema.id)
        .orderBy(desc(AssignmentSchema.createdAt));

      return assignments;
    } catch (error) {
      console.error('Error fetching faculty assignments with statistics:', error);
      return [];
    }
  },

  // Course Week operations
  createCourseWeek: async (data: {
    courseId: string;
    weekNumber: number;
    title: string;
    description?: string | null;
    learningObjectives?: string | null;
    topics?: string | null;
    isPublished?: boolean;
    plannedStartDate?: Date | null;
    plannedEndDate?: Date | null;
  }): Promise<CourseWeekEntity> => {
    const [courseWeek] = await db
      .insert(CourseWeekSchema)
      .values({
        courseId: data.courseId,
        weekNumber: data.weekNumber,
        title: data.title,
        description: data.description,
        learningObjectives: data.learningObjectives,
        topics: data.topics,
        isPublished: data.isPublished ?? false,
        plannedStartDate: data.plannedStartDate,
        plannedEndDate: data.plannedEndDate,
      })
      .returning();
    
    return courseWeek;
  },

  getCourseWeeks: async (courseId: string): Promise<CourseWeekEntity[]> => {
    return db
      .select()
      .from(CourseWeekSchema)
      .where(eq(CourseWeekSchema.courseId, courseId))
      .orderBy(asc(CourseWeekSchema.weekNumber));
  },

  getCourseWeekById: async (weekId: string): Promise<CourseWeekEntity | null> => {
    const [result] = await db
      .select()
      .from(CourseWeekSchema)
      .where(eq(CourseWeekSchema.id, weekId));
    return result ?? null;
  },

  updateCourseWeek: async (
    weekId: string, 
    updates: Partial<{
      title: string;
      description: string | null;
      learningObjectives: string | null;
      topics: string | null;
      isPublished: boolean;
      plannedStartDate: Date | null;
      plannedEndDate: Date | null;
    }>
  ): Promise<CourseWeekEntity | null> => {
    const [updated] = await db
      .update(CourseWeekSchema)
      .set({
        ...updates,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(CourseWeekSchema.id, weekId))
      .returning();
    
    return updated ?? null;
  },

  deleteCourseWeek: async (weekId: string): Promise<boolean> => {
    const result = await db
      .delete(CourseWeekSchema)
      .where(eq(CourseWeekSchema.id, weekId));
    
    return result.rowCount > 0;
  },

  // Get course weeks with content counts
  getCourseWeeksWithContentCounts: async (courseId: string): Promise<(CourseWeekEntity & { contentCount: number })[]> => {
    const weeks = await db
      .select({
        ...CourseWeekSchema,
        contentCount: sql<number>`COALESCE(
          (SELECT COUNT(*) FROM ${CourseMaterialSchema} 
           WHERE ${CourseMaterialSchema.courseId} = ${CourseWeekSchema.courseId} 
           AND ${CourseMaterialSchema.weekNumber} = ${CourseWeekSchema.weekNumber}), 
          0
        )`
      })
      .from(CourseWeekSchema)
      .where(eq(CourseWeekSchema.courseId, courseId))
      .orderBy(asc(CourseWeekSchema.weekNumber));
    
    return weeks.map(week => ({
      ...week,
      contentCount: Number(week.contentCount)
    }));
  },
};

export type AcademicRepository = typeof pgAcademicRepository;