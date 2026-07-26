import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getSession } from "@/lib/auth/server";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import {
  percentageToGradePoints,
  percentageToLetterGrade,
} from "@/lib/utils/grade-calculator";
import {
  AlertCircle,
  Award,
  CheckCircle,
  Clock,
  FileText,
  Upload,
} from "lucide-react";
import Link from "next/link";

export default async function StudentAssignmentsPage() {
  const session = await getSession();

  if (!session?.user) {
    return <div>Error: Not logged in</div>;
  }

  const userId = session.user.id;

  // Fetch each assignment category with dedicated queries
  const [upcoming, overdue, submitted, gradesSummary] = await Promise.all([
    pgAcademicRepository.getStudentUpcomingAssignments(userId, 50),
    pgAcademicRepository.getStudentOverdueAssignments(userId),
    pgAcademicRepository.getStudentSubmittedAssignments(userId),
    pgAcademicRepository.getStudentGradesSummary(userId),
  ]);

  const graded = gradesSummary.filter(
    ({ submission }) => submission.grade !== null,
  );

  const categorizedAssignments = { upcoming, overdue, submitted, graded };

  const stats = {
    total: upcoming.length + overdue.length + submitted.length,
    completed: submitted.length,
    overdue: overdue.length,
    avgGrade:
      graded.length > 0
        ? graded.reduce(
            (sum, { submission }) => sum + Number(submission.grade),
            0,
          ) / graded.length
        : 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Assignments</h1>
        <p className="text-muted-foreground mt-1">
          Track your assignments and submissions across all courses
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">
                  Total Assignments
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="text-2xl font-bold">{stats.completed}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-2xl font-bold">{stats.overdue}</p>
                <p className="text-xs text-muted-foreground">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">
                  {stats.avgGrade > 0 ? `${stats.avgGrade.toFixed(1)}%` : "N/A"}
                </p>
                <p className="text-xs text-muted-foreground">Average Grade</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assignment Tabs */}
      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="upcoming" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Upcoming ({categorizedAssignments.upcoming.length})
          </TabsTrigger>
          <TabsTrigger value="overdue" className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Overdue ({categorizedAssignments.overdue.length})
          </TabsTrigger>
          <TabsTrigger value="submitted" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Submitted ({categorizedAssignments.submitted.length})
          </TabsTrigger>
          <TabsTrigger value="graded" className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            Graded ({categorizedAssignments.graded.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          <AssignmentsList
            assignments={categorizedAssignments.upcoming}
            type="upcoming"
            emptyMessage="No upcoming assignments. You're all caught up!"
          />
        </TabsContent>

        <TabsContent value="overdue" className="space-y-4">
          <AssignmentsList
            assignments={categorizedAssignments.overdue}
            type="overdue"
            emptyMessage="No overdue assignments. Great job staying on top of your work!"
          />
        </TabsContent>

        <TabsContent value="submitted" className="space-y-4">
          <AssignmentsList
            assignments={categorizedAssignments.submitted}
            type="submitted"
            emptyMessage="No submitted assignments yet."
          />
        </TabsContent>

        <TabsContent value="graded" className="space-y-4">
          <GradedAssignmentsList
            assignments={categorizedAssignments.graded}
            emptyMessage="No graded assignments yet."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AssignmentsList({
  assignments,
  type,
  emptyMessage,
}: {
  assignments: any[];
  type: "upcoming" | "overdue" | "submitted";
  emptyMessage: string;
}) {
  if (assignments.length === 0) {
    return (
      <Card className="text-center py-8">
        <CardContent>
          <FileText className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-muted-foreground">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {assignments.map(({ assignment, course, submission }) => {
        const dueDate = new Date(assignment.dueDate);
        const isOverdue = dueDate < new Date() && type !== "submitted";
        const daysUntilDue = Math.ceil(
          (dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
        );

        return (
          <Card
            key={assignment.id}
            className={`${isOverdue ? "border-destructive/30" : ""}`}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="mt-1">
                  {type === "submitted" ? (
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                  ) : isOverdue ? (
                    <AlertCircle className="h-5 w-5 text-destructive" />
                  ) : (
                    <Clock className="h-5 w-5 text-amber-600" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">
                        {assignment.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {course.courseCode}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {assignment.assignmentType}
                        </Badge>
                        {assignment.points && (
                          <Badge variant="outline" className="text-xs">
                            {assignment.points} pts
                          </Badge>
                        )}
                      </div>
                      {assignment.description && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {assignment.description}
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <p
                        className={`text-sm font-medium ${isOverdue ? "text-destructive" : ""}`}
                      >
                        {isOverdue
                          ? "Overdue"
                          : type === "submitted"
                            ? "Submitted"
                            : `${daysUntilDue} day${daysUntilDue !== 1 ? "s" : ""} left`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Due: {dueDate.toLocaleDateString()}
                      </p>
                      {submission?.submittedAt && (
                        <p className="text-xs text-emerald-600 mt-1">
                          Submitted:{" "}
                          {new Date(
                            submission.submittedAt,
                          ).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    {type !== "submitted" && (
                      <Button size="sm" asChild>
                        <Link href={`/student/assignments/${assignment.id}`}>
                          <Upload className="mr-2 h-3 w-3" />
                          Submit Assignment
                        </Link>
                      </Button>
                    )}
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/student/assignments/${assignment.id}`}>
                        <FileText className="mr-2 h-3 w-3" />
                        View Details
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function GradedAssignmentsList({
  assignments,
  emptyMessage,
}: {
  assignments: any[];
  emptyMessage: string;
}) {
  if (assignments.length === 0) {
    return (
      <Card className="text-center py-8">
        <CardContent>
          <Award className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-muted-foreground">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {assignments.map(({ assignment, course, submission }) => {
        const grade = Number(submission.grade);
        const maxPoints = assignment.totalPoints || assignment.points || 100;
        const percentage = maxPoints > 0 ? (grade / maxPoints) * 100 : grade;
        const letterGrade = percentageToLetterGrade(percentage);
        const gradePoints = percentageToGradePoints(percentage);

        const getGradeColor = (percentage: number) => {
          if (percentage >= 90) return "text-emerald-600";
          if (percentage >= 80) return "text-primary";
          if (percentage >= 70) return "text-amber-600";
          return "text-destructive";
        };

        return (
          <Card key={assignment.id}>
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <Award className="h-5 w-5 text-primary mt-1" />

                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">
                        {assignment.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {course.courseCode}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {assignment.assignmentType}
                        </Badge>
                      </div>
                      {submission.feedback && (
                        <div className="mt-3 p-3 bg-muted/30 rounded-lg">
                          <p className="text-sm font-medium mb-1">
                            Instructor Feedback:
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {submission.feedback}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-2 justify-end mb-1">
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
                          {gradePoints.toFixed(1)} GPA
                        </span>
                      </div>
                      <p
                        className={`text-2xl font-bold ${getGradeColor(percentage)}`}
                      >
                        {grade}
                        {maxPoints && `/${maxPoints}`}
                      </p>
                      <p className={`text-sm ${getGradeColor(percentage)}`}>
                        {percentage.toFixed(1)}%
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Graded:{" "}
                        {new Date(
                          submission.gradedAt || submission.submittedAt,
                        ).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/student/assignments/${assignment.id}`}>
                        <FileText className="mr-2 h-3 w-3" />
                        View Details
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
