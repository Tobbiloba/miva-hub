import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Award, 
  TrendingUp, 
  BarChart3,
  FileText,
  Target,
  Download
} from "lucide-react";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import { getSession } from "@/lib/auth/server";
import { getStudentInfo } from "@/lib/auth/student";
import { 
  calculateSemesterGPA, 
  percentageToLetterGrade, 
  percentageToGradePoints,
  calculateAcademicStanding,
  calculateDegreeProgress,
  type CourseGrade
} from "@/lib/utils/grade-calculator";
import Link from "next/link";

export default async function StudentGradesPage() {
  const session = await getSession();
  const studentInfo = getStudentInfo(session);
  
  if (!studentInfo) {
    return <div>Error: Invalid student session</div>;
  }

  // Fetch grades and course data
  const [gradesSummary, courses] = await Promise.all([
    pgAcademicRepository.getStudentGradesSummary(studentInfo.id),
    pgAcademicRepository.getStudentCourses(studentInfo.id)
  ]);

  // Transform data for grade calculator
  const courseGrades: CourseGrade[] = transformToGradeCalculatorFormat(gradesSummary, courses);
  const currentSemesterGrades = courseGrades; // TODO: Filter by current semester
  
  // Calculate sophisticated GPA and academic metrics
  const gpaCalculation = calculateSemesterGPA(currentSemesterGrades, courseGrades);
  const academicStanding = calculateAcademicStanding(gpaCalculation.cumulativeGPA || gpaCalculation.gpa, gpaCalculation.totalCreditHours);
  const degreeProgress = calculateDegreeProgress(gpaCalculation.totalCreditHours, 120, gpaCalculation.cumulativeGPA || gpaCalculation.gpa);
  
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
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Transcript
          </Button>
          <Button variant="outline" asChild>
            <Link href="/student/assignments">
              <FileText className="mr-2 h-4 w-4" />
              View Assignments
            </Link>
          </Button>
        </div>
      </div>

      {/* GPA Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Award className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{(gpaCalculation.cumulativeGPA || gpaCalculation.gpa).toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Cumulative GPA</p>
                <Badge variant={academicStanding.standing === "Dean's List" ? 'default' : academicStanding.standing === 'Good Standing' ? 'secondary' : 'destructive'} className="text-xs mt-1">
                  {academicStanding.standing}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{(gpaCalculation.semesterGPA || gpaCalculation.gpa).toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Current Semester</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {gpaCalculation.totalCreditHours} credit hours
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Target className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{degreeProgress.percentageComplete.toFixed(0)}%</p>
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
              <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <BarChart3 className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{gradesSummary.length}</p>
                <p className="text-sm text-muted-foreground">Graded Assignments</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {degreeProgress.estimatedSemestersRemaining} semesters left
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Course Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            Course Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {courseGrades.map((courseGrade) => (
              <CourseGradeCard 
                key={courseGrade.courseId}
                courseGrade={courseGrade}
              />
            ))}
            {courseGrades.length === 0 && (
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
            <FileText className="h-5 w-5 text-green-600" />
            Recent Grades
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {gradesSummary.slice(0, 10).map(({ assignment, course, submission }) => (
              <RecentGradeItem 
                key={assignment.id}
                assignment={assignment}
                course={course}
                submission={submission}
              />
            ))}
            {gradesSummary.length === 0 && (
              <div className="text-center py-6">
                <p className="text-muted-foreground">No recent grades to display</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CourseGradeCard({ courseGrade }: { courseGrade: CourseGrade }) {
  const getGradeColor = (average: number) => {
    if (average >= 90) return "bg-green-500";
    if (average >= 80) return "bg-blue-500";
    if (average >= 70) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold">{courseGrade.courseCode}</h3>
            <Badge variant="outline" className="text-xs">
              {courseGrade.creditHours} credits
            </Badge>
            <Badge variant={courseGrade.letterGrade.startsWith('A') ? 'default' : courseGrade.letterGrade.startsWith('B') ? 'secondary' : courseGrade.letterGrade.startsWith('C') ? 'outline' : 'destructive'} className="text-xs">
              {courseGrade.letterGrade}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            {courseGrade.courseName}
          </p>
          <div className="flex items-center gap-4">
            <div>
              <p className="text-2xl font-bold">{courseGrade.percentage.toFixed(1)}%</p>
              <p className="text-sm text-muted-foreground">
                {courseGrade.assignments.length} assignment{courseGrade.assignments.length !== 1 ? 's' : ''} • {courseGrade.gradePoints.toFixed(1)} GPA
              </p>
            </div>
            <div>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${getGradeColor(courseGrade.percentage)}`}>
                {courseGrade.letterGrade}
              </div>
            </div>
          </div>
        </div>
        <div className="ml-4">
          <Progress value={courseGrade.percentage} className="w-24" />
        </div>
      </div>
    </div>
  );
}

function RecentGradeItem({ assignment, course, submission }: { assignment: any; course: any; submission: any }) {
  const grade = Number(submission.grade);
  const maxPoints = assignment.totalPoints || assignment.points || 100;
  const percentage = maxPoints > 0 ? (grade / maxPoints) * 100 : grade;
  const letterGrade = percentageToLetterGrade(percentage);
  const gradePoints = percentageToGradePoints(percentage);
  
  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return "text-green-600";
    if (percentage >= 80) return "text-blue-600";
    if (percentage >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
      <div className="flex-1">
        <h4 className="font-medium">{assignment.title}</h4>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="outline" className="text-xs">
            {course.courseCode}
          </Badge>
          <Badge variant={letterGrade.startsWith('A') ? 'default' : letterGrade.startsWith('B') ? 'secondary' : letterGrade.startsWith('C') ? 'outline' : 'destructive'} className="text-xs">
            {letterGrade}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {new Date(submission.gradedAt || submission.submittedAt).toLocaleDateString()}
          </span>
        </div>
      </div>
      <div className="text-right">
        <p className={`text-lg font-bold ${getGradeColor(percentage)}`}>
          {grade}{maxPoints && `/${maxPoints}`}
        </p>
        <p className={`text-sm ${getGradeColor(percentage)}`}>
          {percentage.toFixed(1)}% • {gradePoints.toFixed(1)} GPA
        </p>
      </div>
    </div>
  );
}

// Helper functions
function transformToGradeCalculatorFormat(grades: any[], courses: any[]): CourseGrade[] {
  // Group grades by course
  const gradesByCourse = grades.reduce((acc, grade) => {
    const courseId = grade.assignment.courseId;
    if (!acc[courseId]) {
      acc[courseId] = [];
    }
    acc[courseId].push(grade);
    return acc;
  }, {} as Record<string, any[]>);

  // Convert to CourseGrade format
  const courseGradeResults: CourseGrade[] = [];
  
  for (const [courseId, gradeEntries] of Object.entries(gradesByCourse)) {
    const course = courses.find(c => c.course.id === courseId)?.course;
    if (!course) continue;

    // Calculate course average percentage
    const totalGrade = (gradeEntries as any[]).reduce((sum, { submission, assignment }) => {
      const grade = Number(submission.grade);
      const maxPoints = assignment.totalPoints || assignment.points || 100;
      return sum + (maxPoints > 0 ? (grade / maxPoints) * 100 : grade);
    }, 0);

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
      assignments: (gradeEntries as any[]).map(({ submission, assignment }) => ({
        points: Number(submission.grade),
        totalPoints: assignment.totalPoints || assignment.points || 100,
        creditHours: course.credits || 3
      }))
    });
  }
  
  return courseGradeResults;
}

