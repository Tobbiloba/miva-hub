import { ActivityTimeline } from "@/components/activity/activity-timeline";
import { CapturesPanel } from "@/components/captures/captures-panel";
import { AskAboutCourse } from "@/components/courses/ask-about-course";
import { EmptyState } from "@/components/layouts/empty-state";
import { PageHeader } from "@/components/layouts/page-header";
import { getSession } from "@/lib/auth/server";
import { CHAT_FIRST } from "@/lib/config/product";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import { BookOpen, Calendar, Clock, FileText, MapPin } from "lucide-react";
import Link from "next/link";
import { Button } from "ui/button";
import { Card } from "ui/card";

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

      {/* Courses Grid */}
      {courses.length > 0 ? (
        <section aria-labelledby="enrolled-courses" className="space-y-4">
          <h2 id="enrolled-courses" className="sr-only">
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

      <div className="grid gap-4 lg:grid-cols-2">
        <CapturesPanel />
        <ActivityTimeline />
      </div>
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
    <Card className="gap-0 py-0">
      <div className="flex-1 p-5">
        <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <span className="font-semibold text-foreground">
            {course.courseCode}
          </span>
          <span>
            {course.credits} credit{course.credits !== 1 ? "s" : ""}
          </span>
          {isNewEnrollment && (
            <span className="flex items-center gap-1 text-brand">
              <span className="size-1.5 rounded-full bg-brand" />
              New
            </span>
          )}
        </p>
        <h3 className="mt-1.5 text-[17px] leading-snug font-semibold tracking-[-0.015em]">
          {course.title}
        </h3>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {department.name} · {course.level || "Undergraduate"}
        </p>

        <div className="mt-4 space-y-1.5 text-[13px]">
          {courseSchedule.length > 0 ? (
            courseSchedule.slice(0, 2).map((schedule, index) => (
              <p
                key={index}
                className="flex items-center gap-2 text-muted-foreground"
              >
                <Clock className="size-3.5" />
                <span className="capitalize">{schedule.dayOfWeek}</span>
                <span className="tabular-nums">
                  {schedule.startTime}–{schedule.endTime}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="size-3.5" />
                  {schedule.roomLocation || "TBD"}
                </span>
              </p>
            ))
          ) : (
            <p className="flex items-center gap-2 text-muted-foreground">
              <Clock className="size-3.5" />
              No timetable yet
            </p>
          )}

          {upcomingAssignments.slice(0, 2).map(({ assignment }) => {
            const dueDate = new Date(assignment.dueDate);
            const daysUntilDue = Math.ceil(
              (dueDate.getTime() - new Date().getTime()) /
                (1000 * 60 * 60 * 24),
            );
            return (
              <p key={assignment.id} className="flex items-center gap-2">
                <FileText className="size-3.5 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">
                  {assignment.title}
                </span>
                <span className="shrink-0 font-medium text-warning">
                  {daysUntilDue > 0 ? `${daysUntilDue}d` : "Due"}
                </span>
              </p>
            );
          })}
        </div>
      </div>

      <div className="border-t border-border px-5 py-2.5">
        <AskAboutCourse courseId={course.id} courseCode={course.courseCode} />
      </div>
    </Card>
  );
}

function EmptyCoursesState() {
  return (
    <EmptyState
      icon={<BookOpen />}
      title="No courses yet"
      action={
        <Button asChild>
          <Link href="/student/courses/browse">Browse courses</Link>
        </Button>
      }
    >
      Add the courses you&apos;re taking this semester and Askly will answer
      from their materials.
    </EmptyState>
  );
}
