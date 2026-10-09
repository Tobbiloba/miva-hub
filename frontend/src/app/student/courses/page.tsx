import { ActivityTimeline } from "@/components/activity/activity-timeline";
import { CapturesPanel } from "@/components/captures/captures-panel";
import { PageHeader } from "@/components/layouts/page-header";
import { getSession } from "@/lib/auth/server";
import { CHAT_FIRST } from "@/lib/config/product";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import {
  BookOpen,
  Calendar,
  Clock,
  FileText,
  GraduationCap,
  MapPin,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "ui/badge";
import { Button } from "ui/button";
import { Card, CardContent, CardTitle } from "ui/card";

export default async function StudentCoursesPage() {
  const session = await getSession();

  if (!session?.user) {
    return <div>Error: Not logged in</div>;
  }

  const userId = session.user.id;

  // Fetch student courses and full schedule in parallel (one batched query each)
  const [courses, allSchedules] = await Promise.all([
    pgAcademicRepository.getStudentCourses(userId),
    pgAcademicRepository.getStudentSchedule(userId),
  ]);

  // Build schedule lookup by courseId
  const scheduleMap = new Map<string, typeof allSchedules>();
  for (const entry of allSchedules) {
    const courseId = entry.course.id;
    if (!scheduleMap.has(courseId)) {
      scheduleMap.set(courseId, []);
    }
    scheduleMap.get(courseId)!.push(entry);
  }

  // Calculate total credits
  const totalCredits = courses.reduce(
    (sum, { course }) => sum + (course.credits || 0),
    0,
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="My Courses"
        description={`${courses.length} course${courses.length !== 1 ? "s" : ""} enrolled · ${totalCredits} total credits`}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/student/courses/browse">
                <BookOpen className="h-4 w-4" />
                Course Registration
              </Link>
            </Button>
            {!CHAT_FIRST && (
              <Button asChild>
                <Link href="/student/schedule">
                  <Calendar className="h-4 w-4" />
                  View Schedule
                </Link>
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <CapturesPanel />
        <ActivityTimeline />
      </div>

      {/* Courses Grid */}
      {courses.length > 0 ? (
        <section aria-labelledby="enrolled-courses" className="space-y-4">
          <h2 id="enrolled-courses" className="font-display text-lg font-bold">
            Enrolled courses
          </h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {courses.map(({ enrollment, course, department }) => (
              <CourseCard
                key={course.id}
                course={course}
                department={department}
                enrollment={enrollment}
                studentId={userId}
                scheduleEntries={scheduleMap.get(course.id) ?? []}
              />
            ))}
          </div>
        </section>
      ) : (
        <EmptyCoursesState />
      )}
    </div>
  );
}

async function CourseCard({
  course,
  department,
  enrollment,
  studentId,
  scheduleEntries,
}: {
  course: any;
  department: any;
  enrollment: any;
  studentId: string;
  scheduleEntries: { schedule: any; course: any; facultyName: string | null }[];
}) {
  // Get upcoming assignments for this course
  const upcomingAssignments = await pgAcademicRepository
    .getStudentUpcomingAssignments(studentId, 3)
    .then((assignments) =>
      assignments.filter((a) => a.assignment.courseId === course.id),
    );

  const courseSchedule = scheduleEntries.map((e) => e.schedule);

  const enrollmentDate = new Date(enrollment.enrollmentDate);
  const isNewEnrollment =
    Date.now() - enrollmentDate.getTime() < 7 * 24 * 60 * 60 * 1000; // 7 days

  return (
    <Card className="group gap-0 py-0 transition-all duration-200 hover:border-foreground/20 hover:shadow-[var(--shadow-float)]">
      <div className="flex items-start gap-3 p-5">
        <span
          className={`grid size-11 shrink-0 place-items-center rounded-xl font-display text-sm font-bold ${courseTile(course.courseCode)}`}
        >
          {String(course.courseCode).slice(0, 3)}
        </span>
        <div className="min-w-0 flex-1">
          <CardTitle className="text-base">{course.courseCode}</CardTitle>
          <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
            {course.title}
          </p>
        </div>
        {isNewEnrollment && (
          <Badge className="shrink-0 border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
            New
          </Badge>
        )}
      </div>

      <div className="flex flex-wrap gap-2 px-5">
        <Badge variant="outline">
          {course.credits} credit{course.credits !== 1 ? "s" : ""}
        </Badge>
        <Badge variant="outline">{course.level || "Undergraduate"}</Badge>
        <Badge variant="outline" className="max-w-full truncate">
          <GraduationCap />
          {department.name}
        </Badge>
      </div>

      <div className="mt-4 space-y-3 border-t px-5 py-4 text-sm">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Schedule</span>
        </div>
        {courseSchedule.length > 0 ? (
          <div className="space-y-1.5">
            {courseSchedule.slice(0, 2).map((schedule, index) => (
              <div
                key={index}
                className="flex items-center justify-between gap-2 rounded-lg border bg-secondary px-3 py-2 text-xs"
              >
                <span className="capitalize">{schedule.dayOfWeek}</span>
                <span>
                  {schedule.startTime} - {schedule.endTime}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {schedule.roomLocation || "TBD"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Schedule not yet set</p>
        )}

        {upcomingAssignments.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>Upcoming ({upcomingAssignments.length})</span>
            </div>
            {upcomingAssignments.slice(0, 2).map(({ assignment }) => {
              const dueDate = new Date(assignment.dueDate);
              const daysUntilDue = Math.ceil(
                (dueDate.getTime() - new Date().getTime()) /
                  (1000 * 60 * 60 * 24),
              );

              return (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs"
                >
                  <span className="flex-1 truncate">{assignment.title}</span>
                  <span className="shrink-0 font-medium text-amber-700 dark:text-amber-400">
                    {daysUntilDue > 0 ? `${daysUntilDue}d` : "Due"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex gap-2 border-t bg-secondary/50 px-5 py-3">
        <Button size="sm" className="flex-1" asChild>
          <Link href={`/student/tutor?course=${course.id}`}>
            <GraduationCap className="h-3.5 w-3.5" />
            Ask AI Tutor
          </Link>
        </Button>
        <Button
          variant="outline"
          size="sm"
          asChild
          title="Course materials"
          aria-label="Course materials"
        >
          <Link href="/student/materials">
            <FileText className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </Card>
  );
}

// Stable pastel tile per course, so a course keeps its colour everywhere.
const COURSE_TILES = [
  "bg-tint-blue text-blue-700 dark:text-blue-300",
  "bg-tint-butter text-amber-700 dark:text-amber-300",
  "bg-tint-green text-green-700 dark:text-green-300",
  "bg-tint-pink text-pink-700 dark:text-pink-300",
  "bg-tint-orange text-orange-700 dark:text-orange-300",
];
function courseTile(code: string) {
  let h = 0;
  for (const ch of String(code)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return COURSE_TILES[h % COURSE_TILES.length];
}

function EmptyCoursesState() {
  return (
    <Card className="border-dashed py-12 text-center">
      <CardContent>
        <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Courses Enrolled</h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          You haven&apos;t enrolled in any courses yet. Browse available courses
          and register for the current semester.
        </p>
        <div className="flex gap-2 justify-center">
          <Button asChild>
            <Link href="/student/courses/browse">
              <BookOpen className="mr-2 h-4 w-4" />
              Browse Courses
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/student/calendar">
              <Calendar className="mr-2 h-4 w-4" />
              Academic Calendar
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
