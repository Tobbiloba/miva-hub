"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  GraduationCap,
  FileText,
  Users,
  Activity,
  Bell,
  Clock,
  MapPin,
  Calendar
} from "lucide-react";

interface ProfileData {
  stats?: {
    enrolledCourses?: number;
    totalCredits?: number;
    upcomingAssignments?: number;
    activeCourses?: number;
    totalStudents?: number;
    pendingGrades?: number;
  };
  courses?: Array<{
    enrollment: any;
    course: any;
    department: any;
  }>;
  students?: any[];
  recentActivity?: Array<{
    type: string;
    message: string;
    course?: string;
    time: string;
    icon: string;
  }>;
  upcomingAssignments?: any[];
  recentAnnouncements?: any[];
  department?: {
    id: string;
    code: string;
    name: string;
    contactEmail?: string;
    contactPhone?: string;
  };
}

interface ProfileOverviewProps {
  userRole: string;
  profileData: ProfileData;
}

export function ProfileOverview({ userRole, profileData }: ProfileOverviewProps) {
  // Debug logging (development only)
  if (process.env.NODE_ENV === 'development') {
    console.log('ProfileOverview Debug:', {
      userRole,
      hasProfileData: !!profileData,
      coursesLength: profileData?.courses?.length || 0,
      stats: profileData?.stats
    });
  }

  const stats = profileData?.stats || {};
  const courses = profileData?.courses || [];
  const recentActivity = profileData?.recentActivity || [];
  const upcomingAssignments = profileData?.upcomingAssignments || [];
  const students = profileData?.students || [];

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {userRole === "student" && (
          <>
            <Card className="bg-card border-border/40">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.enrolledCourses || 0}</p>
                    <p className="text-sm text-muted-foreground">Enrolled Courses</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-card border-border/40">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <GraduationCap className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.totalCredits || 0}</p>
                    <p className="text-sm text-muted-foreground">Total Credits</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border/40">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-500/10">
                    <FileText className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.upcomingAssignments || 0}</p>
                    <p className="text-sm text-muted-foreground">Pending Assignments</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {userRole === "faculty" && (
          <>
            <Card className="bg-card border-border/40">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.activeCourses || 0}</p>
                    <p className="text-sm text-muted-foreground">Active Courses</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-card border-border/40">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <Users className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.totalStudents || 0}</p>
                    <p className="text-sm text-muted-foreground">Total Students</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border/40">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-500/10">
                    <FileText className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.pendingGrades || 0}</p>
                    <p className="text-sm text-muted-foreground">Pending Grades</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Current Courses */}
        <Card className="bg-card border-border/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              {userRole === "student" ? "Enrolled Courses" : "Teaching This Semester"}
            </CardTitle>
            <CardDescription>
              {userRole === "student" ? "Your current course enrollment" : "Courses you are currently teaching"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {courses.length > 0 ? (
                courses.slice(0, 4).map((courseData, index) => {
                  const { course, department, enrollment } = courseData;
                  
                  // Handle potential missing data gracefully
                  if (!course || !department) {
                    console.warn('Incomplete course data:', courseData);
                    return null;
                  }
                  
                  return (
                    <div key={course.id || index} className="flex items-center justify-between p-3 border border-border/40 rounded-lg bg-muted/20">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {course.courseCode || 'N/A'}
                          </Badge>
                          <p className="font-medium text-sm">{course.title || 'Untitled Course'}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {department.name || 'Unknown Dept'} • {course.credits || 0} credits
                        </p>
                      </div>
                      {userRole === "student" && enrollment?.status && (
                        <Badge variant={enrollment.status === 'enrolled' ? 'default' : 'secondary'}>
                          {enrollment.status}
                        </Badge>
                      )}
                    </div>
                  );
                }).filter(Boolean)
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="font-medium">No courses found</p>
                  <p className="text-sm mt-1">
                    {userRole === "student" 
                      ? "You haven't enrolled in any courses yet" 
                      : "No teaching assignments for this semester"
                    }
                  </p>
                  <p className="text-xs mt-2 text-muted-foreground/80">
                    Check with your academic advisor if this seems incorrect
                  </p>
                </div>
              )}
              {courses.length > 4 && (
                <div className="text-center pt-2">
                  <Button variant="ghost" size="sm">
                    View all {courses.length} courses
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity / Assignments */}
        <Card className="bg-card border-border/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {userRole === "student" ? (
                <>
                  <FileText className="h-5 w-5" />
                  Upcoming Assignments
                </>
              ) : (
                <>
                  <Activity className="h-5 w-5" />
                  Recent Activity
                </>
              )}
            </CardTitle>
            <CardDescription>
              {userRole === "student" ? "Your upcoming assignments and deadlines" : "Your recent actions and updates"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {userRole === "student" && upcomingAssignments.length > 0 ? (
                upcomingAssignments.slice(0, 4).map((assignmentData, index) => {
                  const { assignment, course } = assignmentData;
                  const dueDate = new Date(assignment.dueDate);
                  const isOverdue = dueDate < new Date();
                  const isNearDue = dueDate.getTime() - new Date().getTime() < 2 * 24 * 60 * 60 * 1000; // 2 days

                  return (
                    <div key={index} className="flex items-start gap-3 p-3 border border-border/40 rounded-lg bg-muted/20">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isOverdue ? 'bg-red-500/10' : isNearDue ? 'bg-orange-500/10' : 'bg-blue-500/10'
                      }`}>
                        <FileText className={`h-4 w-4 ${
                          isOverdue ? 'text-red-600' : isNearDue ? 'text-orange-600' : 'text-blue-600'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{assignment.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {course.courseCode} • Due {dueDate.toLocaleDateString()}
                        </p>
                        {isOverdue && (
                          <Badge variant="destructive" className="text-xs mt-1">Overdue</Badge>
                        )}
                        {!isOverdue && isNearDue && (
                          <Badge variant="secondary" className="text-xs mt-1 bg-orange-500/10 text-orange-600">Due Soon</Badge>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : recentActivity.length > 0 ? (
                recentActivity.slice(0, 4).map((activity, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      {activity.icon === 'FileText' && <FileText className="h-4 w-4 text-primary" />}
                      {activity.icon === 'Bell' && <Bell className="h-4 w-4 text-primary" />}
                      {activity.icon === 'Activity' && <Activity className="h-4 w-4 text-primary" />}
                      {activity.icon === 'GraduationCap' && <GraduationCap className="h-4 w-4 text-primary" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">{activity.message}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {activity.time}
                        {activity.course && (
                          <>
                            <span>•</span>
                            <span>{activity.course}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No recent activity</p>
                  <p className="text-sm">Activity will appear here as you use the system</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Department Information */}
      {profileData?.department && (
        <Card className="bg-card border-border/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Department Information
            </CardTitle>
            <CardDescription>Your academic department details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-foreground">Department</p>
                <p className="text-sm text-muted-foreground">
                  {profileData.department.name} ({profileData.department.code})
                </p>
              </div>
              {profileData.department.contactEmail && (
                <div>
                  <p className="text-sm font-medium text-foreground">Contact Email</p>
                  <p className="text-sm text-muted-foreground">{profileData.department.contactEmail}</p>
                </div>
              )}
              {profileData.department.contactPhone && (
                <div>
                  <p className="text-sm font-medium text-foreground">Contact Phone</p>
                  <p className="text-sm text-muted-foreground">{profileData.department.contactPhone}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Faculty Students Overview */}
      {userRole === "faculty" && students.length > 0 && (
        <Card className="bg-card border-border/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Recent Students
            </CardTitle>
            <CardDescription>Students from your courses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {students.slice(0, 6).map((studentData, index) => {
                const { student, enrollment, course } = studentData;
                return (
                  <div key={index} className="flex items-center gap-3 p-3 border border-border/40 rounded-lg bg-muted/20">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-medium">
                        {student.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{student.name}</p>
                      <p className="text-xs text-muted-foreground">{course.courseCode}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            {students.length > 6 && (
              <div className="text-center pt-4">
                <Button variant="ghost" size="sm">
                  View all {students.length} students
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}