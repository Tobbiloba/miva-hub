import { tool as createTool } from "ai";
import { and, asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { pgDb } from "../../../db/pg/db.pg";
import {
  CourseInstructorSchema,
  CourseSchema,
  FacultySchema,
  StudentEnrollmentSchema,
  UserSchema,
} from "../../../db/pg/schema.pg";

/**
 * My Courses — the signed-in student's own enrollments, straight from
 * Askly's database. Bound to the session user (never an id from the model).
 * The result matches createCourseList's input, so the model can render it
 * without inventing course data.
 */
export const createMyCoursesTool = (userId: string) =>
  createTool({
    description:
      "Get the signed-in student's enrolled courses (code, title, credits, instructor, status). Call this before createCourseList; never invent course lists.",
    inputSchema: z.object({
      includePast: z
        .boolean()
        .optional()
        .default(false)
        .describe("Also include completed, dropped or failed courses"),
    }),
    execute: async ({ includePast }) => {
      const rows = await pgDb
        .select({
          courseId: CourseSchema.id,
          courseCode: CourseSchema.courseCode,
          title: CourseSchema.title,
          credits: CourseSchema.credits,
          status: StudentEnrollmentSchema.status,
          semester: StudentEnrollmentSchema.semester,
          enrollmentDate: StudentEnrollmentSchema.enrollmentDate,
        })
        .from(StudentEnrollmentSchema)
        .innerJoin(
          CourseSchema,
          eq(StudentEnrollmentSchema.courseId, CourseSchema.id),
        )
        .where(
          includePast
            ? eq(StudentEnrollmentSchema.studentId, userId)
            : and(
                eq(StudentEnrollmentSchema.studentId, userId),
                eq(StudentEnrollmentSchema.status, "enrolled"),
              ),
        )
        .orderBy(asc(CourseSchema.courseCode));

      if (rows.length === 0) {
        return {
          total_courses: 0,
          total_credits: 0,
          courses: [],
          message:
            "You're not enrolled in any courses on Askly yet. You can browse and enroll from Courses → Browse.",
        };
      }

      const instructors = await pgDb
        .select({
          courseId: CourseInstructorSchema.courseId,
          name: UserSchema.name,
        })
        .from(CourseInstructorSchema)
        .innerJoin(
          FacultySchema,
          eq(CourseInstructorSchema.facultyId, FacultySchema.id),
        )
        .innerJoin(UserSchema, eq(FacultySchema.userId, UserSchema.id))
        .where(
          and(
            inArray(
              CourseInstructorSchema.courseId,
              rows.map((r) => r.courseId),
            ),
            eq(CourseInstructorSchema.role, "primary"),
          ),
        );
      const instructorByCourse = new Map(
        instructors.map((i) => [i.courseId, i.name]),
      );

      const current = rows.filter((r) => r.status === "enrolled");
      return {
        semester: current[0]?.semester ?? rows[0].semester,
        total_courses: rows.length,
        total_credits: current.reduce((sum, r) => sum + (r.credits ?? 0), 0),
        courses: rows.map((r) => ({
          course_code: r.courseCode,
          course_name: r.title,
          credits: r.credits,
          instructor: instructorByCourse.get(r.courseId),
          status: r.status,
          enrollment_date: r.enrollmentDate?.toISOString().slice(0, 10),
        })),
      };
    },
  });
