import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { 
  FileText,
  ArrowLeft,
  Clock,
  Calendar,
  Download,
  CheckCircle,
  AlertCircle,
  Paperclip,
  Award,
} from "lucide-react";
import { getSession } from "@/lib/auth/server";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import Link from "next/link";
import { notFound } from "next/navigation";
import SubmitForm from "./submit-form";

interface PageProps {
  params: { assignmentId: string };
}

export default async function AssignmentSubmissionPage({ params }: PageProps) {
  const session = await getSession();
  
  if (!session?.user) {
    return <div>Error: Not logged in</div>;
  }

  const userId = session.user.id;

  // Get assignment details and check if student has access
  const upcomingAssignments = await pgAcademicRepository.getStudentUpcomingAssignments(userId, 100);
  const assignmentData = upcomingAssignments.find(({ assignment }) => assignment.id === params.assignmentId);

  if (!assignmentData) {
    return notFound();
  }

  const { assignment, course, submission } = assignmentData;
  
  // Calculate timing information
  const dueDate = new Date(assignment.dueDate);
  const now = new Date();
  const isOverdue = dueDate < now;
  const timeUntilDue = dueDate.getTime() - now.getTime();
  const daysUntilDue = Math.ceil(timeUntilDue / (1000 * 60 * 60 * 24));

  // Submission status
  const isSubmitted = !!submission;
  const isGraded = submission?.grade !== null && submission?.grade !== undefined;
  const canSubmit = !isSubmitted && (assignment.allowLateSubmission || !isOverdue);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/student/assignments">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Assignments
            </Link>
          </Button>
          
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <FileText className="h-8 w-8 text-blue-600" />
              {assignment.title}
            </h1>
            <p className="text-muted-foreground mt-1">
              {course.courseCode} • {assignment.totalPoints} points
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          {assignment.instructions && (
            <Button variant="outline" disabled>
              <Download className="mr-2 h-4 w-4" />
              Instructions Available
            </Button>
          )}
        </div>
      </div>

      {/* Status Banner */}
      <Card className={`border-2 ${
        isGraded 
          ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950'
          : isSubmitted 
            ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950'
            : isOverdue 
              ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'
              : 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950'
      }`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            {isGraded ? (
              <Award className="h-5 w-5 text-green-600" />
            ) : isSubmitted ? (
              <CheckCircle className="h-5 w-5 text-blue-600" />
            ) : isOverdue ? (
              <AlertCircle className="h-5 w-5 text-red-600" />
            ) : (
              <Clock className="h-5 w-5 text-orange-600" />
            )}
            
            <div className="flex-1">
              <p className="font-medium">
                {isGraded 
                  ? `Graded: ${submission?.grade}/${assignment.totalPoints} points`
                  : isSubmitted 
                    ? 'Assignment Submitted'
                    : isOverdue 
                      ? 'Assignment Overdue'
                      : `Due ${daysUntilDue === 0 ? 'Today' : daysUntilDue > 0 ? `in ${daysUntilDue} days` : `${Math.abs(daysUntilDue)} days ago`}`
                }
              </p>
              <p className="text-sm text-muted-foreground">
                {isGraded && submission?.feedback && `Feedback: ${submission.feedback}`}
                {isSubmitted && !isGraded && `Submitted on ${new Date(submission.submittedAt).toLocaleDateString()}`}
                {!isSubmitted && `Due: ${dueDate.toLocaleDateString()} at ${dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Assignment Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Assignment Description */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Assignment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {assignment.description && (
                <div>
                  <Label className="text-sm font-medium">Description</Label>
                  <div className="mt-2 p-4 bg-muted rounded-lg">
                    <p className="whitespace-pre-wrap text-sm">{assignment.description}</p>
                  </div>
                </div>
              )}
              
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-sm font-medium">Assignment Type</Label>
                  <p className="text-lg">{assignment.assignmentType}</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Submission Type</Label>
                  <p className="text-lg">{assignment.submissionType?.replace('_', ' ') || 'File Upload'}</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Total Points</Label>
                  <p className="text-lg font-bold">{assignment.totalPoints}</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Due Date</Label>
                  <p className="text-lg">{dueDate.toLocaleDateString()}</p>
                  <p className="text-sm text-muted-foreground">
                    {dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge variant={assignment.allowLateSubmission ? "default" : "secondary"}>
                  {assignment.allowLateSubmission ? "Late submissions allowed" : "No late submissions"}
                </Badge>
                {assignment.lateSubmissionPenalty && (
                  <Badge variant="outline">
                    {assignment.lateSubmissionPenalty}% penalty for late submission
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Current Submission */}
          {submission && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Your Submission
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="text-sm font-medium">Submitted</Label>
                    <p className="text-lg">{new Date(submission.submittedAt).toLocaleDateString()}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(submission.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  
                  {submission.grade && (
                    <div>
                      <Label className="text-sm font-medium">Grade</Label>
                      <p className="text-lg font-bold">{submission.grade}/{assignment.totalPoints}</p>
                      <p className="text-sm text-muted-foreground">
                        {((Number(submission.grade) / Number(assignment.totalPoints)) * 100).toFixed(1)}%
                      </p>
                    </div>
                  )}
                </div>
                
                {submission.submissionText && (
                  <div>
                    <Label className="text-sm font-medium">Text Submission</Label>
                    <div className="mt-2 p-4 bg-muted rounded-lg">
                      <pre className="whitespace-pre-wrap text-sm">{submission.submissionText}</pre>
                    </div>
                  </div>
                )}
                
                {submission.fileUrl && (
                  <div>
                    <Label className="text-sm font-medium">Submitted File</Label>
                    <div className="mt-2 p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Paperclip className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="font-medium">{submission.fileName || 'Submitted File'}</p>
                          {submission.fileSize && (
                            <p className="text-sm text-muted-foreground">
                              {(submission.fileSize / 1024 / 1024).toFixed(2)} MB
                            </p>
                          )}
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <a href={submission.fileUrl} target="_blank" rel="noopener noreferrer">
                            <Download className="mr-2 h-3 w-3" />
                            Download
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                
                {submission.feedback && (
                  <div>
                    <Label className="text-sm font-medium">Instructor Feedback</Label>
                    <div className="mt-2 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                      <p className="text-sm">{submission.feedback}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Submission Panel */}
        <div className="space-y-6">
          {canSubmit && !isSubmitted && (
            <SubmitForm 
              assignment={assignment}
              isOverdue={isOverdue}
              studentId={userId}
            />
          )}
          
          {!canSubmit && !isSubmitted && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  Submission Closed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {isOverdue 
                    ? "This assignment is overdue and late submissions are not allowed."
                    : "Submission deadline has passed."
                  }
                </p>
              </CardContent>
            </Card>
          )}
          
          {/* Assignment Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Assignment Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-sm font-medium">Course</Label>
                <p>{course.courseCode} - {course.title}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Due Date</Label>
                <p>{dueDate.toLocaleDateString()}</p>
                <p className="text-sm text-muted-foreground">
                  {dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Points</Label>
                <p className="text-lg font-bold">{assignment.totalPoints}</p>
              </div>
              
              {assignment.weekNumber && (
                <div>
                  <Label className="text-sm font-medium">Week</Label>
                  <p>Week {assignment.weekNumber}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

