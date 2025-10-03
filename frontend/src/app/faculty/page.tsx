import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  LayoutDashboard,
  BookOpen,
  Users,
  FileText,
  Clock,
  AlertCircle,
  TrendingUp,
  Calendar,
  Award,
  MessageSquare,
  Plus,
  ArrowRight,
} from "lucide-react";
import { getSession } from "@/lib/auth/server";
import { getFacultyInfo } from "@/lib/auth/faculty";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import Link from "next/link";

export default async function FacultyDashboard() {
  const session = await getSession();
  const facultyInfo = getFacultyInfo(session);
  
  if (!facultyInfo) {
    return <div>Error: Invalid faculty session</div>;
  }

  // Get faculty database record
  const facultyRecord = await pgAcademicRepository.getFacultyByUserId(facultyInfo.id);
  
  if (!facultyRecord) {
    return <div>Error: Faculty record not found</div>;
  }

  // Fetch dashboard data
  const [dashboardStats, facultyCourses, gradingQueue] = await Promise.all([
    pgAcademicRepository.getFacultyDashboardStats(facultyRecord.id),
    pgAcademicRepository.getFacultyCourses(facultyRecord.id),
    pgAcademicRepository.getFacultyGradingQueue(facultyRecord.id, 5)
  ]);

  const formatPosition = (position: string) => {
    return position
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <LayoutDashboard className="h-8 w-8 text-primary" />
            Faculty Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, {formatPosition(facultyRecord.position)} {facultyInfo.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/faculty/assignments/create">
              <Plus className="mr-2 h-4 w-4" />
              New Assignment
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/faculty/announcements/create">
              <MessageSquare className="mr-2 h-4 w-4" />
              New Announcement
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{dashboardStats.activeCourses}</p>
                <p className="text-sm text-muted-foreground">Active Courses</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{dashboardStats.totalStudents}</p>
                <p className="text-sm text-muted-foreground">Total Students</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{dashboardStats.pendingGrades}</p>
                <p className="text-sm text-muted-foreground">Pending Grades</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{dashboardStats.recentSubmissions}</p>
                <p className="text-sm text-muted-foreground">Recent Submissions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* My Courses */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              My Courses
            </CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link href="/faculty/courses">
                View All
                <ArrowRight className="ml-2 h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {facultyCourses.slice(0, 4).map(({ course, department, courseInstructor }) => (
                <div key={course.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">{course.courseCode}</h4>
                    <p className="text-sm text-muted-foreground">{course.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {department.name}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {courseInstructor.role}
                      </Badge>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/faculty/courses/${course.id}`}>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              ))}
              {facultyCourses.length === 0 && (
                <div className="text-center py-6">
                  <BookOpen className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No courses assigned</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pending Grades */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-orange-600" />
              Pending Grades
            </CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link href="/faculty/grades">
                Grade Book
                <ArrowRight className="ml-2 h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {gradingQueue.map(({ submission, assignment, course, student }) => (
                <div key={submission.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">{assignment.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {student.name} • {course.courseCode}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {submission.isLateSubmission ? 'Late' : 'On Time'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Submitted {new Date(submission.submittedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/faculty/assignments/${assignment.id}/grade`}>
                      Grade
                    </Link>
                  </Button>
                </div>
              ))}
              {gradingQueue.length === 0 && (
                <div className="text-center py-6">
                  <Award className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No pending grades</p>
                  <p className="text-sm text-muted-foreground mt-1">All caught up!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-green-600" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Button variant="outline" className="h-auto p-4 justify-start" asChild>
              <Link href="/faculty/assignments/create">
                <div className="text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <Plus className="h-4 w-4" />
                    <span className="font-medium">Create Assignment</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Add a new assignment to your courses
                  </p>
                </div>
              </Link>
            </Button>
            
            <Button variant="outline" className="h-auto p-4 justify-start" asChild>
              <Link href="/faculty/materials/upload">
                <div className="text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <Plus className="h-4 w-4" />
                    <span className="font-medium">Upload Materials</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Add course materials and resources
                  </p>
                </div>
              </Link>
            </Button>
            
            <Button variant="outline" className="h-auto p-4 justify-start" asChild>
              <Link href="/faculty/announcements/create">
                <div className="text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare className="h-4 w-4" />
                    <span className="font-medium">Post Announcement</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Communicate with your students
                  </p>
                </div>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Urgent Items */}
      {(dashboardStats.pendingGrades > 0 || gradingQueue.length > 0) && (
        <Card className="border-orange-200 dark:border-orange-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <AlertCircle className="h-5 w-5" />
              Action Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardStats.pendingGrades > 0 && (
                <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                  <div>
                    <p className="font-medium">Assignments need grading</p>
                    <p className="text-sm text-muted-foreground">
                      {dashboardStats.pendingGrades} submission{dashboardStats.pendingGrades !== 1 ? 's' : ''} waiting for grades
                    </p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/faculty/grades">
                      Grade Now
                    </Link>
                  </Button>
                </div>
              )}
              {dashboardStats.recentSubmissions > 0 && (
                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <div>
                    <p className="font-medium">New submissions received</p>
                    <p className="text-sm text-muted-foreground">
                      {dashboardStats.recentSubmissions} new submission{dashboardStats.recentSubmissions !== 1 ? 's' : ''} in the last 7 days
                    </p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/faculty/assignments">
                      Review
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}