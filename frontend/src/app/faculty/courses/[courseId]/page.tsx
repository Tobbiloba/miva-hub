import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BookOpen,
  Users,
  FileText,
  Calendar,
  Clock,
  MapPin,
  Award,
  TrendingUp,
  Plus,
  Download,
  Upload,
  Settings,
  ArrowLeft,
  GraduationCap,
  BarChart3
} from "lucide-react";
import { getSession } from "@/lib/auth/server";
import { getFacultyInfo, requireCourseInstructor } from "@/lib/auth/faculty";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import Link from "next/link";
import { notFound } from "next/navigation";

interface CoursePageProps {
  params: {
    courseId: string;
  };
  searchParams: {
    semester?: string;
  };
}

export default async function CourseManagementPage({ params, searchParams }: CoursePageProps) {
  const session = await getSession();
  const facultyInfo = getFacultyInfo(session);
  
  if (!facultyInfo) {
    return <div>Error: Invalid faculty session</div>;
  }

  // Verify faculty can access this course
  const sessionOrError = await requireCourseInstructor(params.courseId, searchParams.semester);
  if (!sessionOrError || typeof sessionOrError !== 'object') {
    return <div>Error: Access denied to this course</div>;
  }

  // Get current semester dynamically for fallback
  const { getCurrentSemester } = await import("@/lib/utils/semester");
  const currentSemester = await getCurrentSemester();
  const semester = searchParams.semester || currentSemester;

  // Get course details
  const [courseDetails, courseStats, courseSchedule, courseMaterials, courseStudents, courseAssignments] = await Promise.all([
    pgAcademicRepository.getCourseWithInstructor(params.courseId, semester),
    pgAcademicRepository.getCourseStatistics(params.courseId, semester),
    pgAcademicRepository.getCourseSchedule(params.courseId, semester),
    pgAcademicRepository.getCourseMaterials(params.courseId),
    pgAcademicRepository.getCourseEnrollments(params.courseId, semester),
    pgAcademicRepository.getFacultyAssignments((await pgAcademicRepository.getFacultyByUserId(facultyInfo.id))!.id, params.courseId)
  ]);

  if (!courseDetails || courseDetails.length === 0) {
    notFound();
  }

  const { course, department, instructor, instructorRole } = courseDetails[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/faculty/courses">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Courses
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{course.courseCode}</h1>
            <p className="text-muted-foreground">{course.title}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">{department.name}</Badge>
              <Badge variant="secondary">{course.credits} credits</Badge>
              <Badge variant="outline" className="capitalize">{semester.replace('-', ' ')}</Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Settings className="mr-2 h-4 w-4" />
            Course Settings
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Content
          </Button>
        </div>
      </div>

      {/* Course Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{courseStats.enrolledStudents}</p>
                <p className="text-sm text-muted-foreground">Enrolled Students</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <FileText className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{courseStats.totalAssignments}</p>
                <p className="text-sm text-muted-foreground">Assignments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Award className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{courseStats.averageGrade.toFixed(1)}%</p>
                <p className="text-sm text-muted-foreground">Average Grade</p>
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
                <p className="text-2xl font-bold">{courseMaterials.length}</p>
                <p className="text-sm text-muted-foreground">Course Materials</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Course Management Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="roster">Roster</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="materials">Materials</TabsTrigger>
          <TabsTrigger value="grades">Grades</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <CourseOverview 
            course={course} 
            department={department} 
            schedule={courseSchedule} 
            instructor={instructor}
            instructorRole={instructorRole}
          />
        </TabsContent>

        <TabsContent value="roster" className="space-y-4">
          <CourseRoster students={courseStudents} />
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          <CourseAssignments assignments={courseAssignments} courseId={params.courseId} />
        </TabsContent>

        <TabsContent value="materials" className="space-y-4">
          <CourseMaterials materials={courseMaterials} courseId={params.courseId} />
        </TabsContent>

        <TabsContent value="grades" className="space-y-4">
          <CourseGrades courseId={params.courseId} />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <CourseAnalytics courseId={params.courseId} stats={courseStats} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CourseOverview({ course, department, schedule, instructor, instructorRole }: any) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Course Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-600" />
            Course Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Description</label>
            <p className="mt-1">{course.description || "No description available"}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Credits</label>
              <p className="mt-1 font-medium">{course.credits}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Level</label>
              <p className="mt-1 font-medium capitalize">{course.level}</p>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Department</label>
            <p className="mt-1 font-medium">{department.name}</p>
          </div>
        </CardContent>
      </Card>

      {/* Schedule Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-green-600" />
            Class Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          {schedule && schedule.length > 0 ? (
            <div className="space-y-3">
              {schedule.map((s: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium capitalize">{s.dayOfWeek}</span>
                      <Badge variant="outline">{s.classType}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{s.startTime} - {s.endTime}</span>
                      </div>
                      {s.roomLocation && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span>{s.roomLocation}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No schedule information available</p>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <Button className="h-auto p-4 justify-start" asChild>
              <Link href={`/faculty/assignments/create?courseId=${course.id}`}>
                <div className="text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <Plus className="h-4 w-4" />
                    <span className="font-medium">New Assignment</span>
                  </div>
                  <p className="text-sm opacity-80">Create assignments for students</p>
                </div>
              </Link>
            </Button>
            
            <Button variant="outline" className="h-auto p-4 justify-start" asChild>
              <Link href={`/faculty/materials/upload?courseId=${course.id}`}>
                <div className="text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <Upload className="h-4 w-4" />
                    <span className="font-medium">Upload Materials</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Add course resources</p>
                </div>
              </Link>
            </Button>
            
            <Button variant="outline" className="h-auto p-4 justify-start" asChild>
              <Link href={`/faculty/grades?courseId=${course.id}`}>
                <div className="text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <GraduationCap className="h-4 w-4" />
                    <span className="font-medium">Grade Book</span>
                  </div>
                  <p className="text-sm text-muted-foreground">View and edit grades</p>
                </div>
              </Link>
            </Button>
            
            <Button variant="outline" className="h-auto p-4 justify-start" asChild>
              <Link href={`/faculty/announcements/create?courseId=${course.id}`}>
                <div className="text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="h-4 w-4" />
                    <span className="font-medium">Announcement</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Post course updates</p>
                </div>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CourseRoster({ students }: { students: any[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-green-600" />
          Enrolled Students ({students.length})
        </CardTitle>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-3 w-3" />
          Export Roster
        </Button>
      </CardHeader>
      <CardContent>
        {students.length > 0 ? (
          <div className="space-y-2">
            {students.map((enrollment) => (
              <div key={enrollment.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <Users className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">Student {enrollment.studentId}</p>
                    <p className="text-sm text-muted-foreground">
                      Enrolled: {new Date(enrollment.enrollmentDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={enrollment.status === "enrolled" ? "default" : "secondary"}>
                    {enrollment.status}
                  </Badge>
                  {enrollment.finalGrade && (
                    <Badge variant="outline">{enrollment.finalGrade}</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Users className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No students enrolled yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CourseAssignments({ assignments, courseId }: { assignments: any[]; courseId: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-purple-600" />
          Course Assignments ({assignments.length})
        </CardTitle>
        <Button asChild>
          <Link href={`/faculty/assignments/create?courseId=${courseId}`}>
            <Plus className="mr-2 h-4 w-4" />
            New Assignment
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {assignments.length > 0 ? (
          <div className="space-y-3">
            {assignments.map(({ assignment }) => (
              <div key={assignment.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium">{assignment.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {assignment.description}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline">{assignment.assignmentType}</Badge>
                    <Badge variant="secondary">{assignment.totalPoints} pts</Badge>
                    <span className="text-xs text-muted-foreground">
                      Due: {new Date(assignment.dueDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/faculty/assignments/${assignment.id}`}>
                      Edit
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/faculty/assignments/${assignment.id}/grade`}>
                      Grade
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No assignments created yet</p>
            <Button className="mt-2" asChild>
              <Link href={`/faculty/assignments/create?courseId=${courseId}`}>
                Create First Assignment
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CourseMaterials({ materials, courseId }: { materials: any[]; courseId: string }) {
  const materialsByWeek = materials.reduce((acc, material) => {
    const week = material.weekNumber || 0;
    if (!acc[week]) acc[week] = [];
    acc[week].push(material);
    return acc;
  }, {} as Record<number, any[]>);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-blue-600" />
          Course Materials ({materials.length})
        </CardTitle>
        <Button asChild>
          <Link href={`/faculty/materials/upload?courseId=${courseId}`}>
            <Upload className="mr-2 h-4 w-4" />
            Upload Materials
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {materials.length > 0 ? (
          <div className="space-y-6">
            {(Object.entries(materialsByWeek) as [string, any[]][])
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([week, weekMaterials]) => (
                <div key={week}>
                  <h4 className="font-medium mb-3">
                    {week === "0" ? "General Materials" : `Week ${week}`}
                  </h4>
                  <div className="space-y-2">
                    {weekMaterials.map((material) => (
                      <div key={material.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{material.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {material.materialType}
                              </Badge>
                              {material.fileSize && (
                                <span className="text-xs text-muted-foreground">
                                  {(material.fileSize / 1024 / 1024).toFixed(2)} MB
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {material.contentUrl && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={material.contentUrl} target="_blank" rel="noopener noreferrer">
                                <Download className="h-3 w-3" />
                              </a>
                            </Button>
                          )}
                          <Button variant="outline" size="sm">
                            <Settings className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <BookOpen className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No course materials uploaded yet</p>
            <Button className="mt-2" asChild>
              <Link href={`/faculty/materials/upload?courseId=${courseId}`}>
                Upload First Material
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CourseGrades({ courseId }: { courseId: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-purple-600" />
          Grade Book
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <GraduationCap className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-muted-foreground">Grade book interface coming soon</p>
          <Button className="mt-2" asChild>
            <Link href={`/faculty/grades?courseId=${courseId}`}>
              Open Grade Book
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CourseAnalytics({ courseId, stats }: { courseId: string; stats: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-orange-600" />
          Course Analytics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="p-4 border rounded-lg">
            <h4 className="font-medium mb-2">Performance Overview</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Average Grade:</span>
                <span className="font-medium">{stats.averageGrade.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Students:</span>
                <span className="font-medium">{stats.enrolledStudents}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Assignments:</span>
                <span className="font-medium">{stats.totalAssignments}</span>
              </div>
            </div>
          </div>
          
          <div className="p-4 border rounded-lg">
            <h4 className="font-medium mb-2">Course Health</h4>
            <div className="text-center py-4">
              <TrendingUp className="mx-auto h-8 w-8 text-green-600 mb-2" />
              <p className="text-sm text-muted-foreground">
                Detailed analytics coming soon
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}