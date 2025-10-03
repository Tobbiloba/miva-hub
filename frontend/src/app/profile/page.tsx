import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User,
  Settings,
  Shield,
  Bell,
  Camera,
  Key,
  BookOpen,
  GraduationCap,
  UserCheck,
  Mail,
  Phone,
  Calendar,
  TrendingUp,
  FileText,
  Award,
  Clock,
  Activity
} from "lucide-react";
import { getSession } from "@/lib/auth/server";
import { getUserRole, getStudentId } from "@/lib/auth/user-utils";
import { redirect } from "next/navigation";
import { ProfileClient } from "@/components/profile/profile-client";

export default async function ProfilePage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/sign-in");
  }

  const user = session.user;
  const userRole = getUserRole(user);
  const studentId = getStudentId(user);

  // Get user profile data (in real app, this would come from database)
  const userProfile = {
    personal: {
      name: user.name || "",
      email: user.email || "",
      phone: (user as any).phone || "",
      bio: (user as any).bio || "",
      avatar: (user as any).avatar || "",
      dateOfBirth: (user as any).dateOfBirth || "",
      address: (user as any).address || "",
    },
    academic: {
      role: userRole || "",
      studentId: studentId || "",
      academicYear: (user as any).academicYear || "",
      department: (user as any).department || "",
      enrollmentStatus: (user as any).enrollmentStatus || "active",
      currentSemester: (user as any).currentSemester || "",
    },
    settings: {
      emailNotifications: (user as any).emailNotifications ?? true,
      pushNotifications: (user as any).pushNotifications ?? true,
      marketingEmails: (user as any).marketingEmails ?? false,
      profileVisibility: (user as any).profileVisibility || "private",
      twoFactorEnabled: (user as any).twoFactorEnabled ?? false,
    },
    // Academic overview data
    overview: {
      // Student data
      currentGPA: userRole === "student" ? 3.45 : null,
      creditsCompleted: userRole === "student" ? 87 : null,
      creditsRequired: userRole === "student" ? 120 : null,
      academicStanding: userRole === "student" ? "Good Standing" : null,
      currentCourses: userRole === "student" ? [
        { code: "CS301", name: "Database Systems", grade: "A-", credits: 3 },
        { code: "CS405", name: "Software Engineering", grade: "B+", credits: 4 },
        { code: "MATH201", name: "Statistics", grade: "A", credits: 3 }
      ] : userRole === "faculty" ? [
        { code: "CS101", name: "Intro to Programming", students: 45, section: "001" },
        { code: "CS301", name: "Database Systems", students: 32, section: "002" }
      ] : [],
      // Faculty data
      teachingLoad: userRole === "faculty" ? 2 : null,
      totalStudents: userRole === "faculty" ? 77 : null,
      averageGrade: userRole === "faculty" ? "B+" : null,
      // Recent activity for all users
      recentActivity: userRole === "student" ? [
        { type: "grade", message: "Received grade for CS301 Assignment 3", time: "2 hours ago", icon: Award },
        { type: "submission", message: "Submitted CS405 Project Proposal", time: "1 day ago", icon: FileText },
        { type: "login", message: "Logged into system", time: "3 days ago", icon: Activity },
        { type: "course", message: "Enrolled in MATH201", time: "1 week ago", icon: BookOpen }
      ] : userRole === "faculty" ? [
        { type: "grading", message: "Graded 12 assignments for CS301", time: "1 hour ago", icon: Award },
        { type: "announcement", message: "Posted announcement for CS101", time: "4 hours ago", icon: FileText },
        { type: "meeting", message: "Attended department meeting", time: "2 days ago", icon: Activity },
        { type: "course", message: "Updated CS301 syllabus", time: "5 days ago", icon: BookOpen }
      ] : [
        { type: "login", message: "Logged into admin panel", time: "1 hour ago", icon: Activity },
        { type: "user", message: "Created new student account", time: "6 hours ago", icon: UserCheck },
        { type: "system", message: "Updated system settings", time: "2 days ago", icon: Settings },
        { type: "report", message: "Generated analytics report", time: "3 days ago", icon: FileText }
      ],
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <User className="h-8 w-8 text-blue-600" />
            My Profile
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your personal information and account settings
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="personal" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Personal
          </TabsTrigger>
          <TabsTrigger value="academic" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Academic
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Preferences
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
        </TabsList>

        {/* Academic Overview */}
        <TabsContent value="overview" className="space-y-6">
          {/* Academic Metrics */}
          {userRole === "student" && (
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-2xl font-bold">{userProfile.overview.currentGPA}</p>
                      <p className="text-xs text-muted-foreground">Current GPA</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-2xl font-bold">{userProfile.overview.creditsCompleted}</p>
                      <p className="text-xs text-muted-foreground">Credits Completed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="text-2xl font-bold">{userProfile.overview.currentCourses.length}</p>
                      <p className="text-xs text-muted-foreground">Current Courses</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-orange-600" />
                    <div>
                      <p className="text-sm font-bold">{userProfile.overview.academicStanding}</p>
                      <p className="text-xs text-muted-foreground">Academic Standing</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {userRole === "faculty" && (
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-2xl font-bold">{userProfile.overview.teachingLoad}</p>
                      <p className="text-xs text-muted-foreground">Courses Teaching</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-2xl font-bold">{userProfile.overview.totalStudents}</p>
                      <p className="text-xs text-muted-foreground">Total Students</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="text-2xl font-bold">{userProfile.overview.averageGrade}</p>
                      <p className="text-xs text-muted-foreground">Average Grade</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            {/* Current Courses */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  {userRole === "student" ? "Current Courses" : "Teaching This Semester"}
                </CardTitle>
                <CardDescription>
                  {userRole === "student" ? "Your enrolled courses and current grades" : "Courses you are currently teaching"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {userProfile.overview.currentCourses.map((course: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{course.code}</p>
                        <p className="text-sm text-muted-foreground">{course.name}</p>
                      </div>
                      <div className="text-right">
                        {userRole === "student" ? (
                          <>
                            <p className="font-bold text-sm">{course.grade}</p>
                            <p className="text-xs text-muted-foreground">{course.credits} credits</p>
                          </>
                        ) : (
                          <>
                            <p className="font-bold text-sm">{course.students} students</p>
                            <p className="text-xs text-muted-foreground">Section {course.section}</p>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
                <CardDescription>
                  Your recent actions and updates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {userProfile.overview.recentActivity.map((activity: any, index: number) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <activity.icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">{activity.message}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {activity.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Progress Bar for Students */}
          {userRole === "student" && (
            <Card>
              <CardHeader>
                <CardTitle>Degree Progress</CardTitle>
                <CardDescription>
                  Your progress toward graduation requirements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Credits Completed</span>
                    <span>{userProfile.overview.creditsCompleted} / {userProfile.overview.creditsRequired}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${(userProfile.overview.creditsCompleted / userProfile.overview.creditsRequired) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {userProfile.overview.creditsRequired - userProfile.overview.creditsCompleted} credits remaining to graduate
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Personal Information */}
        <TabsContent value="personal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Update your personal details and contact information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ProfileClient category="personal" currentProfile={userProfile.personal}>
                {/* Profile Picture */}
                <div className="flex items-center gap-6">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src={userProfile.personal.avatar} alt={userProfile.personal.name} />
                    <AvatarFallback className="text-2xl">
                      {userProfile.personal.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <Button variant="outline" className="flex items-center gap-2">
                      <Camera className="h-4 w-4" />
                      Change Photo
                    </Button>
                    <p className="text-sm text-muted-foreground">
                      JPG, PNG or GIF. Max size of 2MB.
                    </p>
                  </div>
                </div>

                {/* Personal Details */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input 
                      id="fullName" 
                      name="name"
                      defaultValue={userProfile.personal.name}
                      placeholder="Your full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input 
                      id="email" 
                      name="email"
                      type="email" 
                      defaultValue={userProfile.personal.email}
                      placeholder="your.email@miva.edu.ng"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input 
                      id="phone" 
                      name="phone"
                      defaultValue={userProfile.personal.phone}
                      placeholder="+234 XXX XXX XXXX"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                    <Input 
                      id="dateOfBirth" 
                      name="dateOfBirth"
                      type="date" 
                      defaultValue={userProfile.personal.dateOfBirth}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea 
                    id="bio" 
                    name="bio"
                    defaultValue={userProfile.personal.bio}
                    placeholder="Tell us about yourself..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea 
                    id="address" 
                    name="address"
                    defaultValue={userProfile.personal.address}
                    placeholder="Your address"
                    rows={2}
                  />
                </div>
              </ProfileClient>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Academic Information */}
        <TabsContent value="academic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Academic Information</CardTitle>
              <CardDescription>
                Your academic details and university information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ProfileClient category="academic" currentProfile={userProfile.academic}>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Input 
                      id="role" 
                      value={userProfile.academic.role || "Not specified"}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                      Contact admin to change your role
                    </p>
                  </div>

                  {userRole === "student" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="studentId">Student ID</Label>
                        <Input 
                          id="studentId" 
                          value={userProfile.academic.studentId || "Not assigned"}
                          disabled
                          className="bg-muted"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="academicYear">Academic Year</Label>
                        <Select name="academicYear" defaultValue={userProfile.academic.academicYear}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select academic year" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="100">100 Level (Freshman)</SelectItem>
                            <SelectItem value="200">200 Level (Sophomore)</SelectItem>
                            <SelectItem value="300">300 Level (Junior)</SelectItem>
                            <SelectItem value="400">400 Level (Senior)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="enrollmentStatus">Enrollment Status</Label>
                        <Input 
                          id="enrollmentStatus" 
                          value={userProfile.academic.enrollmentStatus || "Active"}
                          disabled
                          className="bg-muted"
                        />
                      </div>
                    </>
                  )}

                  {userRole === "faculty" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="department">Department</Label>
                        <Input 
                          id="department" 
                          name="department"
                          defaultValue={userProfile.academic.department}
                          placeholder="Your department"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="officeHours">Office Hours</Label>
                        <Input 
                          id="officeHours" 
                          name="officeHours"
                          defaultValue={(user as any).officeHours || ""}
                          placeholder="Mon-Fri 2:00-4:00 PM"
                        />
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="currentSemester">Current Semester</Label>
                    <Input 
                      id="currentSemester" 
                      value={userProfile.academic.currentSemester || "2024 Fall"}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                </div>
              </ProfileClient>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose how you want to receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ProfileClient category="settings" currentProfile={userProfile.settings}>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive email notifications for important updates
                      </p>
                    </div>
                    <Switch 
                      name="emailNotifications"
                      defaultChecked={userProfile.settings.emailNotifications} 
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Push Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive push notifications in your browser
                      </p>
                    </div>
                    <Switch 
                      name="pushNotifications"
                      defaultChecked={userProfile.settings.pushNotifications} 
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Marketing Emails</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive emails about new features and updates
                      </p>
                    </div>
                    <Switch 
                      name="marketingEmails"
                      defaultChecked={userProfile.settings.marketingEmails} 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="profileVisibility">Profile Visibility</Label>
                    <Select name="profileVisibility" defaultValue={userProfile.settings.profileVisibility}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Public - Everyone can see</SelectItem>
                        <SelectItem value="university">University - Only MIVA members</SelectItem>
                        <SelectItem value="private">Private - Only me</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </ProfileClient>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Manage your password and security preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ProfileClient category="security" currentProfile={{}}>
                <div className="space-y-6">
                  <div>
                    <h4 className="text-lg font-medium mb-4">Change Password</h4>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="currentPassword">Current Password</Label>
                        <Input 
                          id="currentPassword" 
                          name="currentPassword"
                          type="password" 
                          placeholder="Enter current password"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="newPassword">New Password</Label>
                        <Input 
                          id="newPassword" 
                          name="newPassword"
                          type="password" 
                          placeholder="Enter new password"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm New Password</Label>
                        <Input 
                          id="confirmPassword" 
                          name="confirmPassword"
                          type="password" 
                          placeholder="Confirm new password"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Two-Factor Authentication</Label>
                        <p className="text-sm text-muted-foreground">
                          Add an extra layer of security to your account
                        </p>
                      </div>
                      <Switch 
                        name="twoFactorEnabled"
                        defaultChecked={userProfile.settings.twoFactorEnabled} 
                      />
                    </div>
                  </div>
                </div>
              </ProfileClient>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}