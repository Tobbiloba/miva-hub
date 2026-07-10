import { ActionCard } from "@/components/action-card";
import { StatCard } from "@/components/stat-card";
import { getSession } from "@/lib/auth/server";
import { getStudentId } from "@/lib/auth/user-utils";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import {
  AlertCircle,
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle,
  Clock,
  FileText,
  Layers,
  MessageCircleQuestion,
  NotebookPen,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "ui/badge";
import { Button } from "ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "ui/card";

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
    gradesSummary,
  ] = await Promise.all([
    pgAcademicRepository.getStudentEnrollmentStats(userId),
    pgAcademicRepository.getStudentCourses(userId),
    pgAcademicRepository.getStudentUpcomingAssignments(userId, 5),
    pgAcademicRepository.getStudentRecentAnnouncements(userId, 5),
    pgAcademicRepository.getStudentGradesSummary(userId),
  ]);

  // Calculate some stats
  const completedAssignments = gradesSummary.length;
  const averageGrade =
    gradesSummary.length > 0
      ? gradesSummary.reduce(
          (sum, g) => sum + (Number(g.submission.grade) || 0),
          0,
        ) / gradesSummary.length
      : 0;

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Welcome back, {user.name?.split(" ")[0]}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Here&apos;s your academic overview for today
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Student ID</p>
          <p className="font-mono text-sm">{studentId || "N/A"}</p>
          <p className="text-xs text-muted-foreground">
            {(user as any).academicYear || "N/A"}
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<BookOpen />}
          label="Enrolled Courses"
          value={enrollmentStats.enrolledCourses}
          caption="Current semester"
        />
        <StatCard
          icon={<Award />}
          label="Total Credits"
          value={enrollmentStats.totalCredits}
          caption="This semester"
        />
        <StatCard
          icon={<FileText />}
          label="Upcoming Assignments"
          value={upcomingAssignments.length}
          caption="Due soon"
        />
        <StatCard
          icon={<TrendingUp />}
          label="Average Grade"
          value={averageGrade > 0 ? `${averageGrade.toFixed(1)}%` : "N/A"}
          caption={`${completedAssignments} assignments graded`}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* My Courses */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              My Courses
            </CardTitle>
          </CardHeader>
          <CardContent>
            {courses.length > 0 ? (
              <div className="space-y-3">
                {courses.slice(0, 4).map(({ course }) => (
                  <div
                    key={course.id}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                  >
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
                <p className="text-muted-foreground text-sm">
                  No courses enrolled
                </p>
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
              <FileText className="h-5 w-5 text-primary" />
              Upcoming Assignments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingAssignments.length > 0 ? (
              <div className="space-y-3">
                {upcomingAssignments.map(
                  ({ assignment, course, submission }) => {
                    const dueDate = new Date(assignment.dueDate);
                    const isOverdue = dueDate < new Date();
                    const isSubmitted = !!submission;
                    const daysUntilDue = Math.ceil(
                      (dueDate.getTime() - new Date().getTime()) /
                        (1000 * 60 * 60 * 24),
                    );

                    return (
                      <div
                        key={assignment.id}
                        className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg"
                      >
                        <div className="mt-1">
                          {isSubmitted ? (
                            <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          ) : isOverdue ? (
                            <AlertCircle className="h-4 w-4 text-destructive" />
                          ) : (
                            <Clock className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {assignment.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {course.courseCode}
                          </p>
                          <p
                            className={`text-xs ${isOverdue ? "text-destructive" : "text-muted-foreground"}`}
                          >
                            {isOverdue
                              ? "Overdue"
                              : `${daysUntilDue} day${daysUntilDue !== 1 ? "s" : ""} left`}
                          </p>
                        </div>
                      </div>
                    );
                  },
                )}
                <Button asChild variant="ghost" className="w-full">
                  <Link href="/student/assignments">
                    View All Assignments
                    <ArrowRight className="ml-2 h-3 w-3" />
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-muted-foreground text-sm">
                  No upcoming assignments
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Great! You&apos;re all caught up
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Announcements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Recent Announcements
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentAnnouncements.length > 0 ? (
              <div className="space-y-3">
                {recentAnnouncements
                  .slice(0, 3)
                  .map(({ announcement, course }) => (
                    <div
                      key={announcement.id}
                      className="p-3 bg-muted/30 rounded-lg"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {announcement.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {course ? course.courseCode : "University"}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {new Date(
                            announcement.createdAt,
                          ).toLocaleDateString()}
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
                <p className="text-muted-foreground text-sm">
                  No recent announcements
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Next best actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <ActionCard
          icon={<NotebookPen />}
          title="Plan your study week"
          description="Build an AI study plan around your deadlines and class timetable."
          ctaLabel="Open planner"
          href="/student/plan"
        />
        <ActionCard
          recommended
          icon={<MessageCircleQuestion />}
          title="Ask your AI Professor"
          description="Get a focused tutoring session on whatever you're stuck on right now."
          ctaLabel="Start session"
          href="/student/professor"
        />
        <ActionCard
          icon={<Layers />}
          title="Review flashcards"
          description="Spaced-repetition decks generated from your course materials."
          ctaLabel="Review decks"
          href="/student/flashcards"
        />
      </div>
    </div>
  );
}
