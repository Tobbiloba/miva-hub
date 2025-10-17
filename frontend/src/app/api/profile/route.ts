import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { pgDb } from "@/lib/db/pg/db.pg";
import { UserSchema, FacultySchema, DepartmentSchema } from "@/lib/db/pg/schema.pg";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getUserRole } from "@/lib/auth/user-utils";

// Validation schemas for different profile categories
const personalProfileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long").optional(),
  phone: z.string().optional(),
  bio: z.string().optional(),
  dateOfBirth: z.string().optional(),
  address: z.string().optional(),
});

const academicProfileSchema = z.object({
  academicYear: z.enum(["100", "200", "300", "400"]).optional(),
  department: z.string().optional(),
  officeHours: z.string().optional(),
});

const settingsProfileSchema = z.object({
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  marketingEmails: z.boolean().optional(),
  profileVisibility: z.enum(["public", "university", "private"]).optional(),
  twoFactorEnabled: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get user profile data
    const user = await pgDb
      .select()
      .from(UserSchema)
      .where(eq(UserSchema.id, session.user.id))
      .limit(1);

    if (user.length === 0) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const userData = user[0];
    const userRole = getUserRole(userData);

    // Remove sensitive information
    const { password: _, ...userProfile } = userData;

    // Get role-specific data
    let roleSpecificData: any = {};
    
    if (userRole === 'faculty') {
      // Get faculty record first
      const facultyRecord = await pgAcademicRepository.getFacultyByUserId(session.user.id);
      
      if (facultyRecord) {
        // Get faculty data and related information using facultyId
        const [facultyCourses, facultyStudents, gradingQueue] = await Promise.all([
          pgAcademicRepository.getFacultyCourses(facultyRecord.id).catch(() => []),
          pgAcademicRepository.getFacultyStudents(facultyRecord.id).catch(() => []),
          pgAcademicRepository.getFacultyGradingQueue(facultyRecord.id, 5).catch(() => [])
        ]);

        let departmentData = null;
        if (facultyRecord.departmentId) {
          departmentData = await pgAcademicRepository.getDepartmentById(facultyRecord.departmentId);
        }

        roleSpecificData = {
          faculty: facultyRecord,
          department: departmentData,
          courses: facultyCourses.slice(0, 6),
          students: facultyStudents.slice(0, 8),
          pendingGrades: gradingQueue,
          stats: {
            activeCourses: facultyCourses.length,
            totalStudents: facultyStudents.length,
            pendingGrades: gradingQueue.length
          }
        };
      } else {
        roleSpecificData = {
          faculty: null,
          department: null,
          courses: [],
          students: [],
          pendingGrades: [],
          stats: {
            activeCourses: 0,
            totalStudents: 0,
            pendingGrades: 0
          }
        };
      }
    } else if (userRole === 'student') {
      // Get student data and related information
      const [enrollmentStats, studentCourses, upcomingAssignments, recentAnnouncements] = await Promise.all([
        pgAcademicRepository.getStudentEnrollmentStats(session.user.id),
        pgAcademicRepository.getStudentCourses(session.user.id),
        pgAcademicRepository.getStudentUpcomingAssignments(session.user.id, 5),
        pgAcademicRepository.getStudentRecentAnnouncements(session.user.id, 5)
      ]);

      // Get department info from first enrolled course
      let departmentData = null;
      if (studentCourses.length > 0) {
        departmentData = studentCourses[0].department;
      }

      roleSpecificData = {
        department: departmentData,
        courses: studentCourses,
        upcomingAssignments: upcomingAssignments,
        recentAnnouncements: recentAnnouncements,
        stats: {
          enrolledCourses: enrollmentStats.enrolledCourses,
          totalCredits: enrollmentStats.totalCredits,
          upcomingAssignments: upcomingAssignments.length
        }
      };
    }

    // Get recent activity (simplified for now)
    const recentActivity = await getRecentActivity(session.user.id, userRole);

    const profileData = {
      ...userProfile,
      ...roleSpecificData,
      recentActivity
    };

    return NextResponse.json({
      success: true,
      data: profileData
    });

  } catch (error) {
    console.error('[Profile API] GET Error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch profile',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper function to get recent activity
async function getRecentActivity(userId: string, userRole: string | null) {
  const activities = [];
  
  try {
    if (userRole === 'student') {
      // Get recent assignment submissions (without grades)
      const submissions = await pgAcademicRepository.getStudentUpcomingAssignments(userId, 3);
      submissions.forEach(({ assignment, course }) => {
        activities.push({
          type: 'assignment',
          message: `Assignment due: ${assignment.title}`,
          course: course.courseCode,
          time: new Date(assignment.dueDate).toLocaleDateString(),
          icon: 'FileText'
        });
      });

      // Get recent announcements
      const announcements = await pgAcademicRepository.getStudentRecentAnnouncements(userId, 2);
      announcements.forEach(({ announcement, course }) => {
        activities.push({
          type: 'announcement',
          message: `New announcement: ${announcement.title}`,
          course: course?.courseCode || 'General',
          time: new Date(announcement.createdAt).toLocaleDateString(),
          icon: 'Bell'
        });
      });
    } else if (userRole === 'faculty') {
      // Get faculty record first to get facultyId
      const facultyRecord = await pgAcademicRepository.getFacultyByUserId(userId);
      if (facultyRecord) {
        // Get recent grading queue items
        const gradingQueue = await pgAcademicRepository.getFacultyGradingQueue(facultyRecord.id, 3);
        gradingQueue.forEach(({ assignment, course, student }) => {
          activities.push({
            type: 'grading',
            message: `Pending: ${assignment.title} from ${student.name}`,
            course: course.courseCode,
            time: 'Pending review',
            icon: 'GraduationCap'
          });
        });
      }
    }

    // Add generic login activity
    activities.push({
      type: 'login',
      message: 'Logged into system',
      time: 'Today',
      icon: 'Activity'
    });

    return activities.slice(0, 4); // Limit to 4 recent activities
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    return [
      {
        type: 'login',
        message: 'Logged into system',
        time: 'Today',
        icon: 'Activity'
      }
    ];
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const { category, data } = body;

    if (!category || !data) {
      return NextResponse.json(
        { success: false, error: "Category and data are required" },
        { status: 400 }
      );
    }

    let validatedData: any;
    let updateUserFields: any = {};
    let updateFacultyFields: any = {};

    // Validate data based on category
    switch (category) {
      case 'personal':
        validatedData = personalProfileSchema.parse(data);
        updateUserFields = {
          ...(validatedData.name && { name: validatedData.name }),
          ...(validatedData.phone !== undefined && { phone: validatedData.phone }),
          ...(validatedData.bio !== undefined && { bio: validatedData.bio }),
          ...(validatedData.dateOfBirth !== undefined && { dateOfBirth: validatedData.dateOfBirth }),
          ...(validatedData.address !== undefined && { address: validatedData.address }),
        };
        break;

      case 'academic':
        validatedData = academicProfileSchema.parse(data);
        updateUserFields = {
          ...(validatedData.academicYear && { academicYear: validatedData.academicYear }),
          ...(validatedData.department !== undefined && { department: validatedData.department }),
        };
        updateFacultyFields = {
          ...(validatedData.officeHours !== undefined && { officeHours: validatedData.officeHours }),
        };
        break;

      case 'settings':
        validatedData = settingsProfileSchema.parse(data);
        updateUserFields = {
          ...(validatedData.emailNotifications !== undefined && { emailNotifications: validatedData.emailNotifications }),
          ...(validatedData.pushNotifications !== undefined && { pushNotifications: validatedData.pushNotifications }),
          ...(validatedData.marketingEmails !== undefined && { marketingEmails: validatedData.marketingEmails }),
          ...(validatedData.profileVisibility && { profileVisibility: validatedData.profileVisibility }),
          ...(validatedData.twoFactorEnabled !== undefined && { twoFactorEnabled: validatedData.twoFactorEnabled }),
        };
        break;

      default:
        return NextResponse.json(
          { success: false, error: "Invalid category" },
          { status: 400 }
        );
    }

    // Update user record if there are fields to update
    if (Object.keys(updateUserFields).length > 0) {
      await pgDb
        .update(UserSchema)
        .set({
          ...updateUserFields,
          updatedAt: new Date()
        })
        .where(eq(UserSchema.id, session.user.id));
    }

    // Update faculty record if there are faculty fields to update
    if (Object.keys(updateFacultyFields).length > 0) {
      // Check if faculty record exists
      const existingFaculty = await pgDb
        .select()
        .from(FacultySchema)
        .where(eq(FacultySchema.userId, session.user.id))
        .limit(1);

      if (existingFaculty.length > 0) {
        await pgDb
          .update(FacultySchema)
          .set({
            ...updateFacultyFields,
            updatedAt: new Date()
          })
          .where(eq(FacultySchema.userId, session.user.id));
      }
    }

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully"
    });

  } catch (error) {
    console.error('[Profile API] PUT Error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to update profile',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}