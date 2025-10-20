import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Settings,
  BookOpen,
  Activity,
  CreditCard
} from "lucide-react";
import { getSession } from "@/lib/auth/server";
import { getUserRole, getStudentId } from "@/lib/auth/user-utils";
import { redirect } from "next/navigation";
import { ProfileClient } from "@/components/profile/profile-client";
import { ProfileOverview } from "@/components/profile/profile-overview";
import { BillingTab } from "@/components/profile/billing-tab";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import { pgDb } from "@/lib/db/pg/db.pg";
import { UserSchema } from "@/lib/db/pg/schema.pg";
import { eq } from "drizzle-orm";

interface ProfileData {
  // Basic user info
  id: string;
  name: string;
  email: string;
  image?: string;
  studentId?: string;
  role?: string;
  academicYear?: string;
  enrollmentStatus?: string;
  year?: string;
  currentSemester?: string;
  phone?: string;
  bio?: string;
  dateOfBirth?: string;
  address?: string;
  
  // Academic data
  department?: {
    id: string;
    code: string;
    name: string;
    contactEmail?: string;
    contactPhone?: string;
  };
  courses?: Array<{
    enrollment: any;
    course: any;
    department: any;
  }>;
  faculty?: any;
  students?: any[];
  stats?: {
    enrolledCourses?: number;
    totalCredits?: number;
    upcomingAssignments?: number;
    activeCourses?: number;
    totalStudents?: number;
    pendingGrades?: number;
  };
  recentActivity?: Array<{
    type: string;
    message: string;
    course?: string;
    time: string;
    icon: string;
  }>;
  upcomingAssignments?: any[];
  recentAnnouncements?: any[];
}

async function getCompleteProfileData(userId: string, userRole: string | null): Promise<ProfileData | null> {
  try {
    // Get user profile data from database
    const user = await pgDb
      .select()
      .from(UserSchema)
      .where(eq(UserSchema.id, userId))
      .limit(1);

    if (user.length === 0) {
      return null;
    }

    const userData = user[0];
    
    // Remove sensitive information
    const { password: _, ...userProfile } = userData;

    // Get role-specific data
    let roleSpecificData: any = {};
    
    if (userRole === 'faculty') {
      // Get faculty record first
      const facultyRecord = await pgAcademicRepository.getFacultyByUserId(userId);
      
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
      }
    } else if (userRole === 'student') {
      // Get student data and related information
      const [enrollmentStats, studentCourses, upcomingAssignments, recentAnnouncements] = await Promise.all([
        pgAcademicRepository.getStudentEnrollmentStats(userId),
        pgAcademicRepository.getStudentCourses(userId),
        pgAcademicRepository.getStudentUpcomingAssignments(userId, 5),
        pgAcademicRepository.getStudentRecentAnnouncements(userId, 5)
      ]);

      // Log successful data fetch for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log('Student Data Debug:', {
          userId,
          enrollmentStats,
          coursesCount: studentCourses.length,
          upcomingAssignmentsCount: upcomingAssignments.length,
          announcementsCount: recentAnnouncements.length
        });
      }

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

    // Get recent activity
    const recentActivity = await getRecentActivity(userId, userRole);

    return {
      ...userProfile,
      ...roleSpecificData,
      recentActivity
    };

  } catch (error) {
    console.error('Error fetching complete profile data:', error);
    console.error('Error details:', error instanceof Error ? error.message : error);
    return null;
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

export default async function ProfilePage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/sign-in");
  }

  const user = session.user;
  const userRole = getUserRole(user);
  const studentId = getStudentId(user);

  // Fetch complete profile data server-side
  const profileData = await getCompleteProfileData(user.id, userRole);

  if (!profileData) {
    console.warn('Profile data fetch failed, using fallback data for user:', user.id);
    
    // Fallback to session data if database fetch fails
    const fallbackData: ProfileData = {
      id: user.id,
      name: user.name || "",
      email: user.email || "",
      image: user.image || "",
      studentId: studentId || "",
      role: userRole || "",
      academicYear: (user as any).academicYear || "",
      enrollmentStatus: (user as any).enrollmentStatus || "active",
      year: (user as any).year || "",
      currentSemester: (user as any).currentSemester || "",
      phone: (user as any).phone || "",
      bio: (user as any).bio || "",
      dateOfBirth: (user as any).dateOfBirth || "",
      address: (user as any).address || "",
      stats: {
        enrolledCourses: 0,
        totalCredits: 0,
        upcomingAssignments: 0,
        activeCourses: 0,
        totalStudents: 0,
        pendingGrades: 0
      },
      courses: [],
      recentActivity: [
        {
          type: 'system',
          message: 'Profile data unavailable - using fallback',
          time: 'Now',
          icon: 'Activity'
        },
        {
          type: 'login',
          message: 'Logged into system',
          time: 'Today',
          icon: 'Activity'
        }
      ]
    };
    
    return <ProfilePageContent profileData={fallbackData} userRole={userRole} />;
  }

  // Log successful data fetch (development only)
  if (process.env.NODE_ENV === 'development') {
    console.log('Profile data successfully fetched:', {
      userId: user.id,
      userRole,
      coursesCount: profileData.courses?.length || 0,
      hasStats: !!profileData.stats,
      hasDepartment: !!profileData.department
    });
  }

  return <ProfilePageContent profileData={profileData} userRole={userRole} />;
}

interface ProfilePageContentProps {
  profileData: ProfileData;
  userRole: string | null;
}

function ProfilePageContent({ profileData, userRole }: ProfilePageContentProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/40">
        <div className="container mx-auto px-4 py-6 md:px-6 md:py-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            <Avatar className="h-16 w-16 md:h-20 md:w-20 border-2 border-border self-center sm:self-auto">
              <AvatarImage src={profileData.image} alt={profileData.name} />
              <AvatarFallback className="text-lg md:text-xl font-semibold bg-muted">
                {profileData.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">{profileData.name}</h1>
              <p className="text-muted-foreground mt-1 text-sm md:text-base">{profileData.email}</p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-xs">
                  {profileData.role?.charAt(0).toUpperCase() + profileData.role?.slice(1)}
                </Badge>
                {profileData.studentId && (
                  <Badge variant="outline" className="border-border/60 text-xs">
                    ID: {profileData.studentId}
                  </Badge>
                )}
                {profileData.academicYear && (
                  <Badge variant="outline" className="border-border/60 text-xs">
                    {profileData.academicYear} Level
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6 md:px-6 md:py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid grid-cols-5 w-full max-w-2xl bg-muted/30 border border-border/40">
            <TabsTrigger value="overview" className="data-[state=active]:bg-background text-xs sm:text-sm flex-col sm:flex-row">
              <Activity className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Overview</span>
              <span className="sm:hidden">Home</span>
            </TabsTrigger>
            <TabsTrigger value="personal" className="data-[state=active]:bg-background text-xs sm:text-sm flex-col sm:flex-row">
              <User className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Personal</span>
              <span className="sm:hidden">Info</span>
            </TabsTrigger>
            <TabsTrigger value="academic" className="data-[state=active]:bg-background text-xs sm:text-sm flex-col sm:flex-row">
              <BookOpen className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Academic</span>
              <span className="sm:hidden">School</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-background text-xs sm:text-sm flex-col sm:flex-row">
              <Settings className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Settings</span>
              <span className="sm:hidden">Prefs</span>
            </TabsTrigger>
            <TabsTrigger value="billing" className="data-[state=active]:bg-background text-xs sm:text-sm flex-col sm:flex-row">
              <CreditCard className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Billing</span>
              <span className="sm:hidden">Pay</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <ProfileOverview userRole={userRole || ""} profileData={profileData} />
          </TabsContent>

          {/* Personal Information Tab */}
          <TabsContent value="personal" className="space-y-6">
            <Card className="bg-card border-border/40">
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Update your personal details and contact information</CardDescription>
              </CardHeader>
              <CardContent>
                <ProfileClient category="personal" currentProfile={profileData}>
                  <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-foreground">Full Name</label>
                        <div className="mt-1 p-3 bg-muted/30 border border-border/40 rounded-md text-sm break-words">
                          {profileData.name || "Not provided"}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground">Email Address</label>
                        <div className="mt-1 p-3 bg-muted/30 border border-border/40 rounded-md text-sm break-words">
                          {profileData.email || "Not provided"}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground">Phone Number</label>
                        <div className="mt-1 p-3 bg-muted/30 border border-border/40 rounded-md text-sm">
                          {profileData.phone || "Not provided"}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-foreground">Date of Birth</label>
                        <div className="mt-1 p-3 bg-muted/30 border border-border/40 rounded-md text-sm">
                          {profileData.dateOfBirth || "Not provided"}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground">Bio</label>
                        <div className="mt-1 p-3 bg-muted/30 border border-border/40 rounded-md text-sm min-h-[80px] break-words">
                          {profileData.bio || "No bio available"}
                        </div>
                      </div>
                    </div>
                  </div>
                </ProfileClient>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Academic Information Tab */}
          <TabsContent value="academic" className="space-y-6">
            <Card className="bg-card border-border/40">
              <CardHeader>
                <CardTitle>Academic Information</CardTitle>
                <CardDescription>Your academic details and university information</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-foreground">Role</label>
                      <div className="mt-1 p-3 bg-muted/30 border border-border/40 rounded-md text-sm">
                        {profileData.role?.charAt(0).toUpperCase() + profileData.role?.slice(1) || "Not specified"}
                      </div>
                    </div>
                    {profileData.studentId && (
                      <div>
                        <label className="text-sm font-medium text-foreground">Student ID</label>
                        <div className="mt-1 p-3 bg-muted/30 border border-border/40 rounded-md text-sm font-mono">
                          {profileData.studentId}
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-medium text-foreground">Academic Year</label>
                      <div className="mt-1 p-3 bg-muted/30 border border-border/40 rounded-md text-sm">
                        {profileData.academicYear ? `${profileData.academicYear} Level` : "Not specified"}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-foreground">Enrollment Status</label>
                      <div className="mt-1 p-3 bg-muted/30 border border-border/40 rounded-md text-sm">
                        <Badge variant={profileData.enrollmentStatus === 'active' ? 'default' : 'secondary'} className="text-xs">
                          {profileData.enrollmentStatus?.charAt(0).toUpperCase() + profileData.enrollmentStatus?.slice(1)}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Current Semester</label>
                      <div className="mt-1 p-3 bg-muted/30 border border-border/40 rounded-md text-sm">
                        {profileData.currentSemester || "Not specified"}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card className="bg-card border-border/40">
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>Manage your account preferences and security</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-4">Notification Preferences</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-muted/30 border border-border/40 rounded-md">
                        <div>
                          <p className="text-sm font-medium">Email Notifications</p>
                          <p className="text-xs text-muted-foreground">Receive important updates via email</p>
                        </div>
                        <Badge variant="secondary">Enabled</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-muted/30 border border-border/40 rounded-md">
                        <div>
                          <p className="text-sm font-medium">Course Announcements</p>
                          <p className="text-xs text-muted-foreground">Get notified about course updates</p>
                        </div>
                        <Badge variant="secondary">Enabled</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing" className="space-y-6">
            <BillingTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}