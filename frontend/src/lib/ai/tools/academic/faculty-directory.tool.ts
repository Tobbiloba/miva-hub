import { tool as createTool } from "ai";
import { z } from "zod";
import { pgAcademicRepository } from "../../../db/pg/repositories/academic-repository.pg";
import { pgDb } from "../../../db/pg/db.pg";
import { 
  FacultySchema, 
  CourseSchema, 
  CourseInstructorSchema,
  DepartmentSchema,
  UserSchema 
} from "../../../db/pg/schema.pg";
import { eq, and, ilike, or } from "drizzle-orm";
import { safe } from "ts-safe";

/**
 * Faculty Directory Tool - Find faculty members with contact information and course details
 * Supports search by name, department, course, or email
 */

const facultyDirectorySchema = z.object({
  name: z.string().optional().describe("Faculty name to search (partial names work)"),
  department: z.string().optional().describe("Department code or name to filter by"),
  courseCode: z.string().optional().describe("Find instructor for specific course"),
  email: z.string().optional().describe("Search by email address")
});

export const facultyDirectoryTool = createTool({
  description: "Find faculty member contact information, office hours, and course information",
  inputSchema: facultyDirectorySchema,
  execute: async ({ name, department, courseCode, email }) => {
    return safe(async () => {
      // If searching by course, find the instructor for that specific course
      if (courseCode) {
        const course = await pgAcademicRepository.getCourseByCode(courseCode.toUpperCase());
        
        if (!course) {
          return {
            error: `Course ${courseCode} not found`,
            suggestions: [
              "Check the course code spelling (e.g., CS101, MATH201)",
              "Make sure the course exists this semester"
            ]
          };
        }

        // Get current semester course instructor info
        const currentSemester = await pgAcademicRepository.getActiveAcademicCalendar();
        const semesterCode = currentSemester ? currentSemester.semester : "2024-fall";

        const courseWithInstructor = await pgAcademicRepository.getCourseWithInstructor(course.id, semesterCode);
        
        if (courseWithInstructor.length === 0 || !courseWithInstructor[0].instructor) {
          return {
            message: `Instructor information not available for ${courseCode}`,
            courseInfo: {
              code: course.courseCode,
              title: course.title,
              credits: course.credits,
              level: course.level
            },
            suggestions: [
              "Contact the department office for instructor information",
              "Check the course syllabus",
              "Visit the registrar's office"
            ]
          };
        }

        const instructorData = courseWithInstructor[0];
        const formattedFaculty = await formatFacultyInfo(instructorData.instructor, course);

        return {
          searchType: "course_instructor",
          course: {
            code: course.courseCode,
            title: course.title,
            credits: course.credits,
            level: course.level
          },
          faculty: [formattedFaculty],
          totalFound: 1
        };
      }

      // General faculty search
      let facultyQuery = pgDb
        .select({
          faculty: FacultySchema,
          department: DepartmentSchema,
          user: UserSchema
        })
        .from(FacultySchema)
        .leftJoin(DepartmentSchema, eq(FacultySchema.departmentId, DepartmentSchema.id))
        .leftJoin(UserSchema, eq(FacultySchema.userId, UserSchema.id))
        .where(eq(FacultySchema.isActive, true));

      const conditions: any[] = [eq(FacultySchema.isActive, true)];

      // Build search conditions
      if (name) {
        // Search by user name from the joined UserSchema, not the UUID
        conditions.push(ilike(UserSchema.name, `%${name}%`));
      }
      
      if (department) {
        // Search by department code or name
        conditions.push(
          or(
            ilike(DepartmentSchema.code, `%${department}%`),
            ilike(DepartmentSchema.name, `%${department}%`)
          )
        );
      }
      
      if (email) {
        // Search by actual user email from UserSchema
        conditions.push(ilike(UserSchema.email, `%${email.toLowerCase()}%`));
      }

      if (conditions.length > 1) {
        facultyQuery = pgDb
          .select({
            faculty: FacultySchema,
            department: DepartmentSchema,
            user: UserSchema
          })
          .from(FacultySchema)
          .leftJoin(DepartmentSchema, eq(FacultySchema.departmentId, DepartmentSchema.id))
          .leftJoin(UserSchema, eq(FacultySchema.userId, UserSchema.id))
          .where(and(...conditions));
      }
      
      const faculty = await facultyQuery.orderBy(UserSchema.name);

      if (faculty.length === 0) {
        return {
          message: "No faculty members found matching your search criteria",
          searchCriteria: { name, department, email },
          suggestions: [
            "Try searching with partial names (e.g., 'Sarah' instead of 'Dr. Sarah Johnson')",
            "Check department abbreviations (e.g., 'CS' for Computer Science)",
            "Try broader search terms"
          ],
          totalFound: 0
        };
      }

      // Format faculty information with their courses
      const facultyWithDetails = await Promise.all(
        faculty.map(async (item) => {
          const prof = item.faculty;
          const dept = item.department;
          
          // Get courses taught by this faculty member
          const courses = await pgDb
            .select({
              course: CourseSchema,
              instructorRole: CourseInstructorSchema
            })
            .from(CourseInstructorSchema)
            .innerJoin(CourseSchema, eq(CourseInstructorSchema.courseId, CourseSchema.id))
            .where(eq(CourseInstructorSchema.facultyId, prof.id))
            .orderBy(CourseSchema.courseCode);

          return formatFacultyInfo(prof, null, courses, dept);
        })
      );

      return {
        totalFound: faculty.length,
        searchCriteria: { name, department, email },
        faculty: facultyWithDetails,
        searchType: "general_search"
      };

    }).ifFail((error) => {
      console.error("Faculty directory tool error:", error);
      return {
        isError: true,
        error: error.message,
        solution: "There was a problem accessing the faculty directory. Please try again or contact IT support if the issue persists."
      };
    }).unwrap();
  }
});

/**
 * Format faculty information for consistent response structure
 */
async function formatFacultyInfo(
  faculty: any, 
  specificCourse?: any, 
  allCourses?: any[], 
  department?: any
) {
  return {
    id: faculty.id,
    employeeId: faculty.employeeId,
    userId: faculty.userId,
    position: faculty.position,
    specializations: faculty.specializations || [],
    department: department ? {
      name: department.name,
      code: department.code
    } : null,
    contact: {
      phone: faculty.contactPhone || 'Not available',
      officeLocation: faculty.officeLocation || 'Not available',
    },
    officeHours: faculty.officeHours || [],
    researchInterests: faculty.researchInterests || 'Not specified',
    qualifications: faculty.qualifications || [],
    currentCourse: specificCourse ? {
      code: specificCourse.courseCode,
      title: specificCourse.title,
      credits: specificCourse.credits
    } : undefined,
    allCourses: allCourses?.map(item => ({
      code: item.course.courseCode,
      title: item.course.title,
      credits: item.course.credits,
      role: item.instructorRole?.role || 'instructor',
      semester: item.instructorRole?.semester || 'current'
    })) || [],
    totalCourses: allCourses?.length || 0
  };
}