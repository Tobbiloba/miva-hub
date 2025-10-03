import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, 
  Clock, 
  AlertCircle,
  CheckCircle,
  Calendar,
  Filter,
  Download,
  Upload,
  Award
} from "lucide-react";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import { getSession } from "@/lib/auth/server";
import { getStudentInfo } from "@/lib/auth/student";
import { percentageToLetterGrade, percentageToGradePoints } from "@/lib/utils/grade-calculator";
import Link from "next/link";

export default async function StudentAssignmentsPage() {
  const session = await getSession();
  const studentInfo = getStudentInfo(session);
  
  if (!studentInfo) {
    return <div>Error: Invalid student session</div>;
  }

  // Fetch assignments and grades
  const [upcomingAssignments, gradesSummary] = await Promise.all([
    pgAcademicRepository.getStudentUpcomingAssignments(studentInfo.id, 20),
    pgAcademicRepository.getStudentGradesSummary(studentInfo.id)
  ]);

  // Categorize assignments
  const now = new Date();
  const categorizedAssignments = {
    upcoming: upcomingAssignments.filter(({ assignment, submission }) => 
      new Date(assignment.dueDate) > now && !submission
    ),
    overdue: upcomingAssignments.filter(({ assignment, submission }) => 
      new Date(assignment.dueDate) <= now && !submission
    ),
    submitted: upcomingAssignments.filter(({ submission }) => submission),
    graded: gradesSummary.filter(({ submission }) => submission.grade !== null)
  };

  const stats = {
    total: upcomingAssignments.length + gradesSummary.length,
    completed: categorizedAssignments.submitted.length + categorizedAssignments.graded.length,
    overdue: categorizedAssignments.overdue.length,
    avgGrade: categorizedAssignments.graded.length > 0 
      ? categorizedAssignments.graded.reduce((sum, { submission }) => sum + Number(submission.grade), 0) / categorizedAssignments.graded.length
      : 0
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Assignments</h1>
          <p className="text-muted-foreground mt-1">
            Track your assignments and submissions across all courses
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
          <Button variant="outline" asChild>
            <Link href="/student/calendar">
              <Calendar className="mr-2 h-4 w-4" />
              Calendar View
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Assignments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
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
              <AlertCircle className="h-5 w-5 text-red-600" />
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
              <Award className="h-5 w-5 text-purple-600" />
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
  emptyMessage 
}: { 
  assignments: any[];
  type: 'upcoming' | 'overdue' | 'submitted';
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
        const isOverdue = dueDate < new Date() && type !== 'submitted';
        const daysUntilDue = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        
        return (
          <Card key={assignment.id} className={`${isOverdue ? 'border-red-200 dark:border-red-800' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="mt-1">
                  {type === 'submitted' ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : isOverdue ? (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  ) : (
                    <Clock className="h-5 w-5 text-orange-600" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{assignment.title}</h3>
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
                      <p className={`text-sm font-medium ${isOverdue ? 'text-red-600' : ''}`}>
                        {isOverdue ? 'Overdue' : type === 'submitted' ? 'Submitted' : `${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''} left`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Due: {dueDate.toLocaleDateString()}
                      </p>
                      {submission?.submittedAt && (
                        <p className="text-xs text-green-600 mt-1">
                          Submitted: {new Date(submission.submittedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-3">
                    {type !== 'submitted' && (
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
                    {assignment.filePath && (
                      <Button variant="outline" size="sm">
                        <Download className="mr-2 h-3 w-3" />
                        Download
                      </Button>
                    )}
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
  emptyMessage 
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
          if (percentage >= 90) return "text-green-600";
          if (percentage >= 80) return "text-blue-600";
          if (percentage >= 70) return "text-yellow-600";
          return "text-red-600";
        };

        return (
          <Card key={assignment.id}>
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <Award className="h-5 w-5 text-purple-600 mt-1" />
                
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{assignment.title}</h3>
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
                          <p className="text-sm font-medium mb-1">Instructor Feedback:</p>
                          <p className="text-sm text-muted-foreground">{submission.feedback}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-2 justify-end mb-1">
                        <Badge variant={letterGrade.startsWith('A') ? 'default' : letterGrade.startsWith('B') ? 'secondary' : letterGrade.startsWith('C') ? 'outline' : 'destructive'} className="text-xs">
                          {letterGrade}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{gradePoints.toFixed(1)} GPA</span>
                      </div>
                      <p className={`text-2xl font-bold ${getGradeColor(percentage)}`}>
                        {grade}{maxPoints && `/${maxPoints}`}
                      </p>
                      <p className={`text-sm ${getGradeColor(percentage)}`}>
                        {percentage.toFixed(1)}%
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Graded: {new Date(submission.gradedAt || submission.submittedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-3">
                    <Button variant="outline" size="sm">
                      <FileText className="mr-2 h-3 w-3" />
                      View Submission
                    </Button>
                    {assignment.filePath && (
                      <Button variant="outline" size="sm">
                        <Download className="mr-2 h-3 w-3" />
                        Download Assignment
                      </Button>
                    )}
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