import { ActionCard } from "@/components/action-card";
import {
  DonutChart,
  DonutLegend,
  Sparkline,
  TrendPill,
} from "@/components/charts";
import { StatCard } from "@/components/stat-card";
import { getSession } from "@/lib/auth/server";
import { getStudentId } from "@/lib/auth/user-utils";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import {
  AlertCircle,
  ArrowRight,
  Award,
  BarChart3,
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

  // Grade rows as percentages, ordered oldest→newest for the trajectory.
  const gradedRows = gradesSummary
    .map((g) => {
      const pts = Number(g.assignment.totalPoints) || 100;
      const raw = Number(g.submission.grade) || 0;
      const pct = pts > 0 ? (raw / pts) * 100 : raw;
      const when =
        g.submission.gradedAt ??
        g.submission.submittedAt ??
        g.submission.createdAt;
      return { pct, when: new Date(when).getTime() };
    })
    .sort((a, b) => a.when - b.when);

  const averageGrade =
    gradedRows.length > 0
      ? gradedRows.reduce((s, r) => s + r.pct, 0) / gradedRows.length
      : 0;

  const trajectory = gradedRows.map((r) => Math.round(r.pct));

  // Real trend: recent-half average vs earlier-half average (no invented data).
  let gradeDelta: number | undefined;
  if (gradedRows.length >= 4) {
    const mid = Math.floor(gradedRows.length / 2);
    const avg = (rows: typeof gradedRows) =>
      rows.reduce((s, r) => s + r.pct, 0) / rows.length;
    gradeDelta = Math.round(
      avg(gradedRows.slice(mid)) - avg(gradedRows.slice(0, mid)),
    );
  }

  // Colors read semantically for grades: green (good) → red (failing).
  const gradeDistribution = [
    {
      label: "A (90+)",
      value: gradedRows.filter((r) => r.pct >= 90).length,
      colorClass: "text-emerald-500",
    },
    {
      label: "B (80–89)",
      value: gradedRows.filter((r) => r.pct >= 80 && r.pct < 90).length,
      colorClass: "text-primary",
    },
    {
      label: "C (70–79)",
      value: gradedRows.filter((r) => r.pct >= 70 && r.pct < 80).length,
      colorClass: "text-amber-500",
    },
    {
      label: "D/F (<70)",
      value: gradedRows.filter((r) => r.pct < 70).length,
      colorClass: "text-destructive",
    },
  ].filter((d) => d.value > 0);

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
          delta={gradeDelta}
          caption={`${completedAssignments} assignments graded`}
        />
      </div>

      {/* Performance analytics — real trajectory + distribution from grades */}
      {gradedRows.length >= 2 && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Grade Trajectory
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-semibold">
                      {trajectory[0]}%
                    </span>
                    <span className="text-muted-foreground">→</span>
                    <span className="text-3xl font-semibold">
                      {trajectory[trajectory.length - 1]}%
                    </span>
                    {gradeDelta !== undefined && (
                      <TrendPill delta={gradeDelta} />
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    across {gradedRows.length} graded assignment
                    {gradedRows.length !== 1 ? "s" : ""} this semester
                  </p>
                </div>
                <Sparkline
                  data={trajectory}
                  width={280}
                  height={72}
                  strokeWidth={2}
                  className="hidden sm:block"
                />
              </div>
              <Sparkline
                data={trajectory}
                width={320}
                height={64}
                strokeWidth={2}
                className="mt-4 w-full sm:hidden"
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Grade Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-5">
              <DonutChart
                data={gradeDistribution}
                size={120}
                strokeWidth={16}
                centerValue={String(completedAssignments)}
                centerLabel="graded"
              />
              <DonutLegend data={gradeDistribution} className="flex-1" />
            </CardContent>
          </Card>
        </div>
      )}

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
