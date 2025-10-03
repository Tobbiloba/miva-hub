import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { 
  GraduationCap,
  Users,
  Search,
  Filter,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  Download,
  Upload,
  BarChart3,
  Award,
  Eye,
} from "lucide-react";
import { getSession } from "@/lib/auth/server";
import { getFacultyInfo } from "@/lib/auth/faculty";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PageProps {
  searchParams: { courseId?: string; semester?: string };
}

export default async function FacultyGradesPage({ searchParams }: PageProps) {
  const session = await getSession();
  const facultyInfo = getFacultyInfo(session);
  
  if (!facultyInfo) {
    return <div>Error: Invalid faculty session</div>;
  }

  const facultyRecord = await pgAcademicRepository.getFacultyByUserId(facultyInfo.id);
  
  if (!facultyRecord) {
    return <div>Error: Faculty record not found</div>;
  }

  // Get faculty courses for filter dropdown
  const facultyCourses = await pgAcademicRepository.getFacultyCourses(facultyRecord.id);
  
  // Get grading queue (pending assignments)
  const gradingQueue = await pgAcademicRepository.getFacultyGradingQueue(facultyRecord.id, 20);

  // If specific course selected, get gradebook data
  let gradebookData: Awaited<ReturnType<typeof pgAcademicRepository.getCourseGradebook>> | null = null;
  let selectedCourse: typeof facultyCourses[0] | null = null;
  
  if (searchParams.courseId) {
    selectedCourse = facultyCourses.find(fc => fc.course.id === searchParams.courseId) || null;
    if (selectedCourse) {
      gradebookData = await pgAcademicRepository.getCourseGradebook(
        searchParams.courseId, 
        facultyRecord.id
      );
    }
  }

  // Calculate stats
  const stats = {
    totalPending: gradingQueue.length,
    coursesCount: facultyCourses.length,
    totalStudents: gradebookData ? gradebookData.students.length : 0,
    averageGrade: gradebookData ? 
      calculateAverageGrade(gradebookData) : 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-blue-600" />
            Grade Book
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage student grades and view grading progress
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Grades
          </Button>
          <Button variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Import Grades
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalPending}</p>
                <p className="text-sm text-muted-foreground">Pending Grades</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.coursesCount}</p>
                <p className="text-sm text-muted-foreground">Active Courses</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalStudents}</p>
                <p className="text-sm text-muted-foreground">Total Students</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.averageGrade.toFixed(1)}%</p>
                <p className="text-sm text-muted-foreground">Average Grade</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Course Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search students by name or ID..."
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={searchParams.courseId || "all"}>
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Select course" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                {facultyCourses.map(({ course, department }) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.courseCode} - {course.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              More Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs defaultValue={gradebookData ? "gradebook" : "pending"} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pending ({stats.totalPending})
          </TabsTrigger>
          <TabsTrigger value="gradebook" className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            Grade Book
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <PendingGrades gradingQueue={gradingQueue} />
        </TabsContent>

        <TabsContent value="gradebook" className="space-y-4">
          {gradebookData && selectedCourse ? (
            <CourseGradebook 
              course={selectedCourse.course}
              gradebookData={gradebookData}
            />
          ) : (
            <CourseSelector courses={facultyCourses} />
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <GradeAnalytics 
            courses={facultyCourses} 
            selectedCourseId={searchParams.courseId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PendingGrades({ gradingQueue }: { gradingQueue: any[] }) {
  if (gradingQueue.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <CheckCircle className="mx-auto h-12 w-12 text-green-600 mb-4" />
          <h3 className="text-lg font-medium mb-2">All Caught Up!</h3>
          <p className="text-muted-foreground">
            No assignments are waiting for grades. Great job!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {gradingQueue.map(({ submission, assignment, course, student }) => {
        const isLate = submission.isLateSubmission;
        const daysSinceSubmitted = Math.floor(
          (new Date().getTime() - new Date(submission.submittedAt).getTime()) / (1000 * 60 * 60 * 24)
        );
        
        return (
          <Card key={submission.id} className={`hover:shadow-md transition-shadow ${isLate ? 'border-red-200 dark:border-red-800' : ''}`}>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="mt-1">
                  {isLate ? (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  ) : (
                    <Clock className="h-5 w-5 text-orange-600" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">{assignment.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Student: {student.name} ({student.email})
                      </p>
                      
                      <div className="flex items-center gap-2 mt-3">
                        <Badge variant="outline" className="text-xs">
                          {course.courseCode}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {assignment.assignmentType}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {assignment.totalPoints} pts
                        </Badge>
                        {isLate && (
                          <Badge variant="outline" className="text-xs bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300">
                            Late Submission
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right shrink-0">
                      <p className="text-sm font-medium">
                        Submitted {daysSinceSubmitted === 0 ? 'Today' : `${daysSinceSubmitted} days ago`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(submission.submittedAt).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(submission.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        <span>
                          Due: {new Date(assignment.dueDate).toLocaleDateString()}
                        </span>
                      </div>
                      {submission.fileUrl && (
                        <div className="flex items-center gap-1">
                          <Download className="h-3 w-3" />
                          <span>File attached</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/faculty/assignments/${assignment.id}/submissions/${submission.id}`}>
                          <Eye className="mr-2 h-3 w-3" />
                          Review
                        </Link>
                      </Button>
                      
                      <Button size="sm" asChild>
                        <Link href={`/faculty/assignments/${assignment.id}/grade?submissionId=${submission.id}`}>
                          <Award className="mr-2 h-3 w-3" />
                          Grade Now
                        </Link>
                      </Button>
                    </div>
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

function CourseSelector({ courses }: { courses: any[] }) {
  return (
    <Card className="text-center py-12">
      <CardContent>
        <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">Select a Course</h3>
        <p className="text-muted-foreground mb-6">
          Choose a course to view its grade book and manage student grades
        </p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 max-w-4xl mx-auto">
          {courses.map(({ course, department }) => (
            <Button
              key={course.id}
              variant="outline"
              className="h-auto p-4 justify-start"
              asChild
            >
              <Link href={`/faculty/grades?courseId=${course.id}`}>
                <div className="text-left">
                  <div className="font-medium">{course.courseCode}</div>
                  <div className="text-sm text-muted-foreground">{course.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {department.name}
                  </div>
                </div>
              </Link>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function CourseGradebook({ course, gradebookData }: { course: any; gradebookData: any }) {
  const { students, assignments, submissions } = gradebookData;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            {course.courseCode} - {course.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-medium">Student</th>
                  {assignments.map((assignment: any) => (
                    <th key={assignment.id} className="text-center p-2 font-medium min-w-[80px]">
                      <div className="text-xs">{assignment.title}</div>
                      <div className="text-xs text-muted-foreground">
                        ({assignment.totalPoints} pts)
                      </div>
                    </th>
                  ))}
                  <th className="text-center p-2 font-medium">Average</th>
                </tr>
              </thead>
              <tbody>
                {students.map(({ student, enrollment }: any) => {
                  const studentSubmissions = submissions.get(student.id) || new Map();
                  const grades = assignments.map((assignment: any) => {
                    const submission = studentSubmissions.get(assignment.id);
                    return submission?.submission.grade ? Number(submission.submission.grade) : null;
                  });
                  
                  const validGrades = grades.filter(g => g !== null) as number[];
                  const average = validGrades.length > 0 
                    ? validGrades.reduce((sum, grade) => sum + grade, 0) / validGrades.length 
                    : null;

                  return (
                    <tr key={student.id} className="border-b hover:bg-muted/50">
                      <td className="p-2">
                        <div>
                          <div className="font-medium">{student.name}</div>
                          <div className="text-xs text-muted-foreground">{student.email}</div>
                        </div>
                      </td>
                      {assignments.map((assignment: any) => {
                        const submission = studentSubmissions.get(assignment.id);
                        const grade = submission?.submission.grade;
                        
                        return (
                          <td key={assignment.id} className="p-2 text-center">
                            {submission ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto p-1"
                                asChild
                              >
                                <Link href={`/faculty/assignments/${assignment.id}/grade?submissionId=${submission.submission.id}`}>
                                  {grade ? (
                                    <div className="text-center">
                                      <div className="font-medium">{grade}</div>
                                      <div className="text-xs text-muted-foreground">
                                        /{assignment.totalPoints}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-orange-600 text-xs">
                                      Pending
                                    </div>
                                  )}
                                </Link>
                              </Button>
                            ) : (
                              <div className="text-muted-foreground text-xs">
                                Not submitted
                              </div>
                            )}
                          </td>
                        );
                      })}
                      <td className="p-2 text-center">
                        {average ? (
                          <div className="font-medium">{average.toFixed(1)}%</div>
                        ) : (
                          <div className="text-muted-foreground text-xs">N/A</div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function GradeAnalytics({ courses, selectedCourseId }: { courses: any[]; selectedCourseId?: string }) {
  return (
    <Card className="text-center py-12">
      <CardContent>
        <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">Analytics Coming Soon</h3>
        <p className="text-muted-foreground">
          Detailed grade analytics and insights will be available here
        </p>
      </CardContent>
    </Card>
  );
}

function calculateAverageGrade(gradebookData: any): number {
  const { students, assignments, submissions } = gradebookData;
  
  let totalGrades = 0;
  let gradeCount = 0;
  
  students.forEach(({ student }: any) => {
    const studentSubmissions = submissions.get(student.id) || new Map();
    assignments.forEach((assignment: any) => {
      const submission = studentSubmissions.get(assignment.id);
      if (submission?.submission.grade) {
        totalGrades += Number(submission.submission.grade);
        gradeCount++;
      }
    });
  });
  
  return gradeCount > 0 ? totalGrades / gradeCount : 0;
}