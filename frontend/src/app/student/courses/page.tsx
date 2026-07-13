import { getSession } from "@/lib/auth/server";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import {
  ArrowRight,
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
import { Card, CardContent, CardHeader, CardTitle } from "ui/card";

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Courses</h1>
          <p className="text-muted-foreground mt-1">
            {courses.length} course{courses.length !== 1 ? "s" : ""} enrolled •{" "}
            {totalCredits} total credits
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/student/courses/browse">
              <BookOpen className="mr-2 h-4 w-4" />
              Course Registration
            </Link>
          </Button>
          <Button disabled title="Coming soon">
            <Calendar className="mr-2 h-4 w-4" />
            View Schedule
          </Button>
        </div>
      </div>

      {/* Courses Grid */}
      {courses.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
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
    <Card className="group hover:shadow-lg transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{course.courseCode}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {course.title}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant="outline" className="text-xs">
              {course.credits} credit{course.credits !== 1 ? "s" : ""}
            </Badge>
            {isNewEnrollment && (
              <Badge className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                New
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Department & Level */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1">
            <GraduationCap className="h-4 w-4 text-blue-600" />
            <span className="text-muted-foreground">{department.name}</span>
          </div>
          <Badge variant="secondary" className="text-xs">
            {course.level || "Undergraduate"}
          </Badge>
        </div>

        {/* Schedule */}
        <div className="space-y-2">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Schedule</span>
          </div>
          {courseSchedule.length > 0 ? (
            <div className="space-y-1">
              {courseSchedule.slice(0, 2).map((schedule, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between text-xs bg-muted/30 p-2 rounded"
                >
                  <span className="capitalize">{schedule.dayOfWeek}</span>
                  <span>
                    {schedule.startTime} - {schedule.endTime}
                  </span>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    <span>{schedule.roomLocation || "TBD"}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              Schedule not yet set
            </p>
          )}
        </div>

        {/* Upcoming Assignments */}
        {upcomingAssignments.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>Upcoming ({upcomingAssignments.length})</span>
            </div>
            <div className="space-y-1">
              {upcomingAssignments.slice(0, 2).map(({ assignment }) => {
                const dueDate = new Date(assignment.dueDate);
                const daysUntilDue = Math.ceil(
                  (dueDate.getTime() - new Date().getTime()) /
                    (1000 * 60 * 60 * 24),
                );

                return (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between text-xs bg-orange-50 dark:bg-orange-950/30 p-2 rounded"
                  >
                    <span className="truncate flex-1">{assignment.title}</span>
                    <span className="text-orange-600 dark:text-orange-400 shrink-0">
                      {daysUntilDue > 0 ? `${daysUntilDue}d` : "Due"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button size="sm" className="flex-1" disabled title="Coming soon">
            View Course
            <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
          <Button variant="outline" size="sm" disabled title="Coming soon">
            <FileText className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyCoursesState() {
  return (
    <Card className="text-center py-12">
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
          <Button variant="outline" disabled title="Coming soon">
            <Calendar className="mr-2 h-4 w-4" />
            Academic Calendar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
