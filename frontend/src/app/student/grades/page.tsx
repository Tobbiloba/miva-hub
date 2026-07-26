import { DonutChart, DonutLegend, PerformanceGauge } from "@/components/charts";
import { ProgressRing } from "@/components/progress-ring";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth/server";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import {
  type CourseGrade,
  calculateAcademicStanding,
  calculateDegreeProgress,
  calculateGPA,
  calculateSemesterGPA,
  percentageToGradePoints,
  percentageToLetterGrade,
} from "@/lib/utils/grade-calculator";
import { Award, BarChart3, FileText, Target } from "lucide-react";
import Link from "next/link";

export default async function StudentGradesPage() {
  const session = await getSession();

  if (!session?.user) {
    return <div>Error: Not logged in</div>;
  }

  const userId = session.user.id;
  const userAcademicYear = (session.user as any).academicYear as
    | string
    | undefined;

  // Fetch ALL grades (historical) and current-semester courses
  const [allGradesSummary, courses] = await Promise.all([
    pgAcademicRepository.getStudentGradesSummary(userId, {
      includeHistorical: true,
    }),
    pgAcademicRepository.getStudentCourses(userId, { includeHistorical: true }),
  ]);

  // Transform ALL grades for cumulative GPA
  const allCourseGrades: CourseGrade[] = transformToGradeCalculatorFormat(
    allGradesSummary,
    courses,
  );

  // Split current-semester grades by matching enrollment academicYear
  const currentSemesterGrades: CourseGrade[] = userAcademicYear
    ? transformToGradeCalculatorFormat(
        allGradesSummary.filter(
          (g) => g.enrollment?.academicYear === userAcademicYear,
        ),
        courses,
      )
    : allCourseGrades;

  const hasCurrentSemesterGrades = currentSemesterGrades.length > 0;

  // Calculate GPA metrics
  const gpaCalculation = calculateSemesterGPA(
    currentSemesterGrades,
    allCourseGrades,
  );
  const currentSemesterGPA = hasCurrentSemesterGrades
    ? calculateGPA(currentSemesterGrades)
    : null;
  const academicStanding = calculateAcademicStanding(
    gpaCalculation.cumulativeGPA || gpaCalculation.gpa,
    gpaCalculation.totalCreditHours,
  );
  const degreeProgress = calculateDegreeProgress(
    gpaCalculation.totalCreditHours,
    120,
    gpaCalculation.cumulativeGPA || gpaCalculation.gpa,
  );

  // Overall score + distribution across every graded assignment.
  const allAssignmentPcts = allCourseGrades
    .flatMap((c) => c.assignments)
    .map((a) => (a.totalPoints > 0 ? (a.points / a.totalPoints) * 100 : 0));
  const overallPct =
    allAssignmentPcts.length > 0
      ? allAssignmentPcts.reduce((s, p) => s + p, 0) / allAssignmentPcts.length
      : 0;
  const gradeDistribution = [
    {
      label: "A (90+)",
      value: allAssignmentPcts.filter((p) => p >= 90).length,
      colorClass: "text-emerald-500",
    },
    {
      label: "B (80–89)",
      value: allAssignmentPcts.filter((p) => p >= 80 && p < 90).length,
      colorClass: "text-primary",
    },
    {
      label: "C (70–79)",
      value: allAssignmentPcts.filter((p) => p >= 70 && p < 80).length,
      colorClass: "text-amber-500",
    },
    {
      label: "D/F (<70)",
      value: allAssignmentPcts.filter((p) => p < 70).length,
      colorClass: "text-destructive",
    },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Academic Performance</h1>
          <p className="text-muted-foreground mt-1">
            Track your grades and academic progress
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/student/assignments">
            <FileText className="mr-2 h-4 w-4" />
            View Assignments
          </Link>
        </Button>
      </div>

      {/* GPA Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Award className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {(gpaCalculation.cumulativeGPA || gpaCalculation.gpa).toFixed(
                    2,
                  )}
                </p>
                <p className="text-sm text-muted-foreground">Cumulative GPA</p>
                <Badge
                  variant={
                    academicStanding.standing === "Dean's List"
                      ? "default"
                      : /probation|warning|suspension/i.test(
                            academicStanding.standing,
                          )
                        ? "destructive"
                        : "secondary"
                  }
                  className="text-xs mt-1"
                >
                  {academicStanding.standing}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <BarChart3 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                {hasCurrentSemesterGrades ? (
                  <>
                    <p className="text-2xl font-bold">
                      {currentSemesterGPA!.gpa.toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Current Semester GPA
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-medium text-muted-foreground">
                      —
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Current Semester GPA
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      No graded courses this semester yet
                    </p>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {degreeProgress.percentageComplete.toFixed(0)}%
                </p>
                <p className="text-sm text-muted-foreground">Degree Progress</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {degreeProgress.remainingHours} hours remaining
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <BarChart3 className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{allGradesSummary.length}</p>
                <p className="text-sm text-muted-foreground">
                  Graded Assignments
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {degreeProgress.estimatedSemestersRemaining} semesters left
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Overview — gauge + distribution */}
      {allAssignmentPcts.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="flex flex-col items-center justify-center py-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-center text-base">
                Overall Score
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <PerformanceGauge value={overallPct} size={200} label="" />
              <p className="mt-2 text-sm text-muted-foreground">
                across {allAssignmentPcts.length} graded assignment
                {allAssignmentPcts.length !== 1 ? "s" : ""}
              </p>
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Grade Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-8">
              <DonutChart
                data={gradeDistribution}
                size={150}
                centerValue={String(allAssignmentPcts.length)}
                centerLabel="graded"
              />
              <DonutLegend
                data={gradeDistribution}
                className="flex-1 max-w-xs"
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Course Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Course Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {allCourseGrades.map((courseGrade) => (
              <CourseGradeCard
                key={courseGrade.courseId}
                courseGrade={courseGrade}
              />
            ))}
            {allCourseGrades.length === 0 && (
              <div className="text-center py-8">
                <Award className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No grades available yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Grades will appear here once assignments are graded
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Grades */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            Recent Grades
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {allGradesSummary
              .slice(0, 10)
              .map(({ assignment, course, submission }) => (
                <RecentGradeItem
                  key={assignment.id}
                  assignment={assignment}
                  course={course}
                  submission={submission}
                />
              ))}
            {allGradesSummary.length === 0 && (
              <div className="text-center py-6">
                <p className="text-muted-foreground">
                  No recent grades to display
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CourseGradeCard({ courseGrade }: { courseGrade: CourseGrade }) {
  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold">{courseGrade.courseCode}</h3>
            <Badge variant="outline" className="text-xs">
              {courseGrade.creditHours} credits
            </Badge>
            <Badge
              variant={
                courseGrade.letterGrade.startsWith("A")
                  ? "default"
                  : courseGrade.letterGrade.startsWith("B")
                    ? "secondary"
                    : courseGrade.letterGrade.startsWith("C")
                      ? "outline"
                      : "destructive"
              }
              className="text-xs"
            >
              {courseGrade.letterGrade}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            {courseGrade.courseName}
          </p>
          <div className="flex items-center gap-4">
            <div>
              <p className="text-2xl font-bold">
                {courseGrade.percentage.toFixed(1)}%
              </p>
              <p className="text-sm text-muted-foreground">
                {courseGrade.assignments.length} assignment
                {courseGrade.assignments.length !== 1 ? "s" : ""} •{" "}
                {courseGrade.gradePoints.toFixed(1)} GPA
              </p>
            </div>
          </div>
        </div>
        <div className="ml-4 shrink-0">
          <ProgressRing
            value={courseGrade.percentage}
            size={64}
            strokeWidth={6}
          />
        </div>
      </div>
    </div>
  );
}

function RecentGradeItem({
  assignment,
  course,
  submission,
}: { assignment: any; course: any; submission: any }) {
  const grade = Number(submission.grade);
  const maxPoints = assignment.totalPoints || assignment.points || 100;
  const percentage = maxPoints > 0 ? (grade / maxPoints) * 100 : grade;
  const letterGrade = percentageToLetterGrade(percentage);
  const gradePoints = percentageToGradePoints(percentage);

  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return "text-emerald-600 dark:text-emerald-400";
    if (percentage >= 80) return "text-primary";
    if (percentage >= 70) return "text-amber-600 dark:text-amber-400";
    return "text-destructive";
  };

  return (
    <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
      <div className="flex-1">
        <h4 className="font-medium">{assignment.title}</h4>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="outline" className="text-xs">
            {course.courseCode}
          </Badge>
          <Badge
            variant={
              letterGrade.startsWith("A")
                ? "default"
                : letterGrade.startsWith("B")
                  ? "secondary"
                  : letterGrade.startsWith("C")
                    ? "outline"
                    : "destructive"
            }
            className="text-xs"
          >
            {letterGrade}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {new Date(
              submission.gradedAt || submission.submittedAt,
            ).toLocaleDateString()}
          </span>
        </div>
      </div>
      <div className="text-right">
        <p className={`text-lg font-bold ${getGradeColor(percentage)}`}>
          {grade}
          {maxPoints && `/${maxPoints}`}
        </p>
        <p className={`text-sm ${getGradeColor(percentage)}`}>
          {percentage.toFixed(1)}% • {gradePoints.toFixed(1)} GPA
        </p>
      </div>
    </div>
  );
}

// Helper functions
function transformToGradeCalculatorFormat(
  grades: any[],
  courses: any[],
): CourseGrade[] {
  // Group grades by course
  const gradesByCourse = grades.reduce(
    (acc, grade) => {
      const courseId = grade.assignment.courseId;
      if (!acc[courseId]) {
        acc[courseId] = [];
      }
      acc[courseId].push(grade);
      return acc;
    },
    {} as Record<string, any[]>,
  );

  // Convert to CourseGrade format
  const courseGradeResults: CourseGrade[] = [];

  for (const [courseId, gradeEntries] of Object.entries(gradesByCourse)) {
    const course = courses.find((c) => c.course.id === courseId)?.course;
    if (!course) continue;

    // Calculate course average percentage
    const totalGrade = (gradeEntries as any[]).reduce(
      (sum, { submission, assignment }) => {
        const grade = Number(submission.grade);
        const maxPoints = assignment.totalPoints || assignment.points || 100;
        return sum + (maxPoints > 0 ? (grade / maxPoints) * 100 : grade);
      },
      0,
    );

    const percentage = totalGrade / (gradeEntries as any[]).length;
    const letterGrade = percentageToLetterGrade(percentage);
    const gradePoints = percentageToGradePoints(percentage);

    courseGradeResults.push({
      courseId,
      courseCode: course.courseCode,
      courseName: course.title,
      creditHours: course.credits || 3,
      letterGrade,
      gradePoints,
      percentage,
      assignments: (gradeEntries as any[]).map(
        ({ submission, assignment }) => ({
          points: Number(submission.grade),
          totalPoints: assignment.totalPoints || assignment.points || 100,
          creditHours: course.credits || 3,
        }),
      ),
    });
  }

  return courseGradeResults;
}
