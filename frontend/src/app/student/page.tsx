import { Card, CardContent, CardHeader, CardTitle } from "ui/card";
import { Button } from "ui/button";
import { Badge } from "ui/badge";
import { 
  BookOpen, 
  FileText, 
  Award, 
  Brain,
  Clock,
  TrendingUp,
  Users,
  AlertCircle,
  CheckCircle,
  ArrowRight
} from "lucide-react";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import { StudentStatsCard } from "@/components/student/student-stats-card";
import { getSession } from "@/lib/auth/server";
import { getStudentId } from "@/lib/auth/user-utils";
import Link from "next/link";

export default async function StudentDashboard() {
  const session = await getSession();
  
  if (!session?.user) {
    return <div>Error: Not logged in</div>;
  }

  const user = session.user;
  const userId = user.id;
  const studentId = getStudentId(user);

  // Fetch student data
  const [
    enrollmentStats,
    courses,
    upcomingAssignments,
    recentAnnouncements,
    gradesSummary
  ] = await Promise.all([
    pgAcademicRepository.getStudentEnrollmentStats(userId),
    pgAcademicRepository.getStudentCourses(userId),
    pgAcademicRepository.getStudentUpcomingAssignments(userId, 5),
    pgAcademicRepository.getStudentRecentAnnouncements(userId, 5),
    pgAcademicRepository.getStudentGradesSummary(userId)
  ]);

  // Calculate some stats
  const completedAssignments = gradesSummary.length;
  const averageGrade = gradesSummary.length > 0 
    ? gradesSummary.reduce((sum, g) => sum + (Number(g.submission.grade) || 0), 0) / gradesSummary.length
    : 0;

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {user.name?.split(' ')[0]}!</h1>
          <p className="text-muted-foreground mt-1">
            Here&apos;s your academic overview for today
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Student ID</p>
          <p className="font-mono text-sm">{studentId || 'N/A'}</p>
          <p className="text-xs text-muted-foreground">{(user as any).academicYear || 'N/A'}</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StudentStatsCard
          title="Enrolled Courses"
          value={enrollmentStats.enrolledCourses}
          icon={BookOpen}
          description="Current semester"
          accent="blue"
        />
        <StudentStatsCard
          title="Total Credits"
          value={enrollmentStats.totalCredits}
          icon={Award}
          description="This semester"
          accent="green"
        />
        <StudentStatsCard
          title="Upcoming Assignments"
          value={upcomingAssignments.length}
          icon={FileText}
          description="Due soon"
          accent="orange"
        />
        <StudentStatsCard
          title="Average Grade"
          value={averageGrade > 0 ? `${averageGrade.toFixed(1)}%` : "N/A"}
          icon={TrendingUp}
          description={`${completedAssignments} assignments`}
          accent="purple"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* My Courses */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              My Courses
            </CardTitle>
          </CardHeader>
          <CardContent>
            {courses.length > 0 ? (
              <div className="space-y-3">
                {courses.slice(0, 4).map(({ course, department }) => (
                  <div key={course.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{course.courseCode}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                        {course.title}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {course.credits} cr
                    </Badge>
                  </div>
                ))}
                {courses.length > 4 && (
                  <Button asChild variant="ghost" className="w-full">
                    <Link href="/student/courses">
                      View all {courses.length} courses
                      <ArrowRight className="ml-2 h-3 w-3" />
                    </Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-muted-foreground text-sm">No courses enrolled</p>
                <Button size="sm" className="mt-2" disabled title="Coming soon">
                  Register for Courses
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Assignments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-orange-600" />
              Upcoming Assignments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingAssignments.length > 0 ? (
              <div className="space-y-3">
                {upcomingAssignments.map(({ assignment, course, submission }) => {
                  const dueDate = new Date(assignment.dueDate);
                  const isOverdue = dueDate < new Date();
                  const isSubmitted = !!submission;
                  const daysUntilDue = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

                  return (
                    <div key={assignment.id} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                      <div className="mt-1">
                        {isSubmitted ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : isOverdue ? (
                          <AlertCircle className="h-4 w-4 text-red-600" />
                        ) : (
                          <Clock className="h-4 w-4 text-orange-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{assignment.title}</p>
                        <p className="text-xs text-muted-foreground">{course.courseCode}</p>
                        <p className={`text-xs ${isOverdue ? 'text-red-600' : 'text-muted-foreground'}`}>
                          {isOverdue ? 'Overdue' : `${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''} left`}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <Button asChild variant="ghost" className="w-full">
                  <Link href="/student/assignments">
                    View All Assignments
                    <ArrowRight className="ml-2 h-3 w-3" />
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-muted-foreground text-sm">No upcoming assignments</p>
                <p className="text-xs text-muted-foreground mt-1">Great! You&apos;re all caught up</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Announcements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600" />
              Recent Announcements
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentAnnouncements.length > 0 ? (
              <div className="space-y-3">
                {recentAnnouncements.slice(0, 3).map(({ announcement, course }) => (
                  <div key={announcement.id} className="p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{announcement.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {course ? course.courseCode : "University"}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {new Date(announcement.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {announcement.content && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                        {announcement.content}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-muted-foreground text-sm">No recent announcements</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Button asChild variant="outline" className="justify-start">
              <Link href="/student/courses">
                <BookOpen className="mr-2 h-4 w-4" />
                View My Courses
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link href="/student/assignments">
                <FileText className="mr-2 h-4 w-4" />
                Check Assignments
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link href="/student/grades">
                <Award className="mr-2 h-4 w-4" />
                View Grades
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link href="/student/study">
                <Brain className="mr-2 h-4 w-4" />
                Study Buddy
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}