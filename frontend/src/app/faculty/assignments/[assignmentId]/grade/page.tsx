import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Award,
  ArrowLeft,
  Download,
  FileText,
  Clock,
  User,
  CheckCircle,
  Save,
  Send,
  Eye,
  ExternalLink,
} from "lucide-react";
import { getSession } from "@/lib/auth/server";
import { getFacultyInfo } from "@/lib/auth/faculty";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PageProps {
  params: Promise<{ assignmentId: string }>;
  searchParams: Promise<{ submissionId?: string }>;
}

export default async function AssignmentGradingPage({ params, searchParams }: PageProps) {
  const { assignmentId } = await params;
  const searchParamsResolved = await searchParams;
  const session = await getSession();
  const facultyInfo = getFacultyInfo(session);
  
  if (!facultyInfo) {
    return <div>Error: Invalid faculty session</div>;
  }

  const facultyRecord = await pgAcademicRepository.getFacultyByUserId(facultyInfo.id);
  
  if (!facultyRecord) {
    return <div>Error: Faculty record not found</div>;
  }

  // Get assignment submissions
  const submissions = await pgAcademicRepository.getAssignmentSubmissions(
    assignmentId, 
    facultyRecord.id
  );

  if (submissions.length === 0) {
    return notFound();
  }

  // Get specific submission if provided, otherwise use first one
  let currentSubmission = submissions[0];
  if (searchParamsResolved.submissionId) {
    const found = submissions.find(s => s.submission.id === searchParamsResolved.submissionId);
    if (found) currentSubmission = found;
  }

  const assignment = currentSubmission.assignment;
  const course = currentSubmission.course;
  const student = currentSubmission.student;
  const submission = currentSubmission.submission;

  // Calculate submission timing
  const dueDate = new Date(assignment.dueDate);
  const submittedAt = new Date(submission.submittedAt);
  const isLate = submittedAt > dueDate;
  const daysDifference = Math.floor(
    (submittedAt.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Get other submissions for navigation
  const currentIndex = submissions.findIndex(s => s.submission.id === submission.id);
  const previousSubmission = currentIndex > 0 ? submissions[currentIndex - 1] : null;
  const nextSubmission = currentIndex < submissions.length - 1 ? submissions[currentIndex + 1] : null;

  // Calculate statistics
  const gradedCount = submissions.filter(s => s.submission.grade !== null).length;
  const pendingCount = submissions.length - gradedCount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/faculty/assignments">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Assignments
            </Link>
          </Button>
          
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Award className="h-8 w-8 text-blue-600" />
              Grading: {assignment.title}
            </h1>
            <p className="text-muted-foreground mt-1">
              {course.courseCode} • {gradedCount} graded, {pendingCount} pending
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          {submission.fileUrl && (
            <Button variant="outline" asChild>
              <a href={submission.fileUrl} target="_blank" rel="noopener noreferrer">
                <Download className="mr-2 h-4 w-4" />
                Download File
              </a>
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link href={`/faculty/assignments/${assignmentId}`}>
              <Eye className="mr-2 h-4 w-4" />
              View Assignment
            </Link>
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                Submission {currentIndex + 1} of {submissions.length}
              </div>
              
              <Select value={submission.id}>
                <SelectTrigger className="w-[300px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {submissions.map(({ submission: sub, student: st }, index) => (
                    <SelectItem key={sub.id} value={sub.id}>
                      <Link href={`/faculty/assignments/${assignmentId}/grade?submissionId=${sub.id}`} className="flex items-center gap-2">
                        {index + 1}. {st.name}
                        {sub.grade ? (
                          <CheckCircle className="h-3 w-3 text-green-600" />
                        ) : (
                          <Clock className="h-3 w-3 text-orange-600" />
                        )}
                      </Link>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2">
              {previousSubmission && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/faculty/assignments/${assignmentId}/grade?submissionId=${previousSubmission.submission.id}`}>
                    Previous
                  </Link>
                </Button>
              )}
              {nextSubmission && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/faculty/assignments/${assignmentId}/grade?submissionId=${nextSubmission.submission.id}`}>
                    Next
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Student Submission */}
        <div className="lg:col-span-2 space-y-6">
          {/* Student Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Student Submission
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-sm font-medium">Student</Label>
                  <p className="text-lg">{student.name}</p>
                  <p className="text-sm text-muted-foreground">{student.email}</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Submission Date</Label>
                  <p className="text-lg">{submittedAt.toLocaleDateString()}</p>
                  <p className="text-sm text-muted-foreground">
                    {submittedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge variant={isLate ? "destructive" : "default"}>
                  {isLate ? "Late Submission" : "On Time"}
                </Badge>
                {isLate && (
                  <span className="text-sm text-muted-foreground">
                    {daysDifference} day{daysDifference !== 1 ? 's' : ''} late
                  </span>
                )}
                <Badge variant="outline">
                  Due: {dueDate.toLocaleDateString()}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Submission Content */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Submission Content
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                  <Label className="text-sm font-medium">Attached File</Label>
                  <div className="mt-2 p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
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
                          <ExternalLink className="mr-2 h-3 w-3" />
                          Open
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              
              {!submission.submissionText && !submission.fileUrl && (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="mx-auto h-8 w-8 mb-2" />
                  <p>No submission content available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Grading Panel */}
        <div className="space-y-6">
          {/* Assignment Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Assignment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-sm font-medium">Total Points</Label>
                <p className="text-2xl font-bold">{assignment.totalPoints}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Type</Label>
                <p>{assignment.assignmentType}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Due Date</Label>
                <p>{dueDate.toLocaleDateString()}</p>
                <p className="text-sm text-muted-foreground">
                  {dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              
              {assignment.description && (
                <div>
                  <Label className="text-sm font-medium">Description</Label>
                  <p className="text-sm text-muted-foreground">{assignment.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Grading Form */}
          <GradingForm 
            submission={submission}
            assignment={assignment}
            maxPoints={Number(assignment.totalPoints)}
            studentName={student.name}
          />

          {/* Grading History */}
          {submission.grade && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Grading History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">
                      Graded on {submission.gradedAt ? new Date(submission.gradedAt).toLocaleDateString() : 'Unknown'}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Current grade: {submission.grade}/{assignment.totalPoints} 
                    ({((Number(submission.grade) / Number(assignment.totalPoints)) * 100).toFixed(1)}%)
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function GradingForm({ 
  submission, 
  assignment, 
  maxPoints, 
  studentName 
}: { 
  submission: any; 
  assignment: any; 
  maxPoints: number; 
  studentName: string; 
}) {
  const currentGrade = submission.grade ? Number(submission.grade) : '';
  const currentFeedback = submission.feedback || '';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" />
          Grade Submission
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4">
          <div>
            <Label htmlFor="grade">Grade (out of {maxPoints})</Label>
            <Input
              id="grade"
              type="number"
              min="0"
              max={maxPoints}
              step="0.1"
              defaultValue={currentGrade}
              placeholder={`0 - ${maxPoints}`}
              className="mt-1"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Enter a grade between 0 and {maxPoints}
            </p>
          </div>
          
          <div>
            <Label htmlFor="feedback">Feedback</Label>
            <Textarea
              id="feedback"
              defaultValue={currentFeedback}
              placeholder={`Provide feedback for ${studentName}...`}
              className="mt-1"
              rows={4}
            />
          </div>
          
          <div className="flex gap-2">
            <Button type="submit" className="flex-1">
              <Save className="mr-2 h-4 w-4" />
              Save Grade
            </Button>
            <Button type="button" variant="outline">
              <Send className="mr-2 h-4 w-4" />
              Save & Next
            </Button>
          </div>
          
          <div className="text-xs text-muted-foreground">
            Grade will be saved and student will be notified
          </div>
        </form>
      </CardContent>
    </Card>
  );
}