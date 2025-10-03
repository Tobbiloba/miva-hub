import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BookOpen,
  Users,
  Clock,
  MapPin,
  Calendar,
  FileText,
  GraduationCap,
  BarChart3,
  Plus,
  Search,
  Filter,
  ArrowRight,
  Settings
} from "lucide-react";
import { getSession } from "@/lib/auth/server";
import { getFacultyInfo } from "@/lib/auth/faculty";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import Link from "next/link";

export default async function FacultyCoursesPage() {
  const session = await getSession();
  const facultyInfo = getFacultyInfo(session);
  
  if (!facultyInfo) {
    return <div>Error: Invalid faculty session</div>;
  }

  // Get faculty database record
  const facultyRecord = await pgAcademicRepository.getFacultyByUserId(facultyInfo.id);
  
  if (!facultyRecord) {
    return <div>Error: Faculty record not found</div>;
  }

  // Get current semester dynamically
  const { getCurrentSemester } = await import("@/lib/utils/semester");
  const currentSemester = await getCurrentSemester();

  // Fetch course data
  const [facultyCourses, currentSemesterCourses] = await Promise.all([
    pgAcademicRepository.getFacultyCourses(facultyRecord.id),
    pgAcademicRepository.getFacultyCourses(facultyRecord.id, currentSemester)
  ]);

  // Get course statistics for each course
  const coursesWithStats = await Promise.all(
    currentSemesterCourses.map(async ({ course, department, courseInstructor }) => {
      const [enrollmentStats, schedule] = await Promise.all([
        pgAcademicRepository.getCourseStatistics(course.id, currentSemester),
        pgAcademicRepository.getCourseSchedule(course.id, currentSemester)
      ]);
      
      return {
        course,
        department,
        courseInstructor,
        stats: enrollmentStats,
        schedule: schedule[0] // First schedule entry
      };
    })
  );

  const currentCourses = coursesWithStats;
  const allCourses = facultyCourses;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BookOpen className="h-8 w-8 text-blue-600" />
            My Courses
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your teaching assignments and course content
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
          <Button variant="outline">
            <Search className="mr-2 h-4 w-4" />
            Search
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{currentCourses.length}</p>
                <p className="text-xs text-muted-foreground">Active Courses</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">
                  {currentCourses.reduce((sum, course) => sum + course.stats.enrolledStudents, 0)}
                </p>
                <p className="text-xs text-muted-foreground">Total Students</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">
                  {currentCourses.reduce((sum, course) => sum + course.stats.totalAssignments, 0)}
                </p>
                <p className="text-xs text-muted-foreground">Assignments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">
                  {currentCourses.length > 0 
                    ? (currentCourses.reduce((sum, course) => sum + course.stats.averageGrade, 0) / currentCourses.length).toFixed(1)
                    : "0"
                  }%
                </p>
                <p className="text-xs text-muted-foreground">Avg Grade</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Course Tabs */}
      <Tabs defaultValue="current" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="current" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Current Semester ({currentCourses.length})
          </TabsTrigger>
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            All Courses ({allCourses.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-4">
          <CurrentCoursesList courses={currentCourses} />
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          <AllCoursesList courses={allCourses} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CurrentCoursesList({ courses }: { courses: any[] }) {
  if (courses.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Current Courses</h3>
          <p className="text-muted-foreground">
            No courses assigned for the current semester.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {courses.map(({ course, department, courseInstructor, stats, schedule }) => (
        <Card key={course.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-xl">{course.courseCode}</CardTitle>
                <p className="text-muted-foreground mt-1">{course.title}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline">{department.name}</Badge>
                  <Badge variant="secondary">{courseInstructor.role}</Badge>
                  <Badge variant="outline">{course.credits} credits</Badge>
                </div>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/faculty/courses/${course.id}`}>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Course Stats */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.enrolledStudents}</p>
                <p className="text-xs text-muted-foreground">Students</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{stats.totalAssignments}</p>
                <p className="text-xs text-muted-foreground">Assignments</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">{stats.averageGrade.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">Avg Grade</p>
              </div>
            </div>

            {/* Schedule Info */}
            {schedule && (
              <div className="flex items-center gap-4 text-sm border-t pt-4">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{schedule.dayOfWeek} {schedule.startTime}-{schedule.endTime}</span>
                </div>
                {schedule.roomLocation && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{schedule.roomLocation}</span>
                  </div>
                )}
              </div>
            )}

            {/* Quick Actions */}
            <div className="flex gap-2 border-t pt-4">
              <Button size="sm" variant="outline" asChild>
                <Link href={`/faculty/courses/${course.id}`}>
                  <Settings className="mr-2 h-3 w-3" />
                  Manage
                </Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link href={`/faculty/assignments/create?courseId=${course.id}`}>
                  <Plus className="mr-2 h-3 w-3" />
                  Assignment
                </Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link href={`/faculty/grades?courseId=${course.id}`}>
                  <GraduationCap className="mr-2 h-3 w-3" />
                  Grades
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AllCoursesList({ courses }: { courses: any[] }) {
  if (courses.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Courses Found</h3>
          <p className="text-muted-foreground">
            No courses have been assigned to you yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group courses by semester
  const coursesBySemester = courses.reduce((acc, course) => {
    const semester = course.courseInstructor.semester;
    if (!acc[semester]) {
      acc[semester] = [];
    }
    acc[semester].push(course);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="space-y-6">
      {(Object.entries(coursesBySemester) as [string, any[]][])
        .sort(([a], [b]) => b.localeCompare(a)) // Sort semesters in reverse order (newest first)
        .map(([semester, semesterCourses]) => (
          <div key={semester}>
            <h3 className="text-lg font-semibold mb-4 capitalize">
              {semester.replace('-', ' ')} Semester ({semesterCourses.length} courses)
            </h3>
            <div className="grid gap-4 md:grid-cols-3">
              {semesterCourses.map(({ course, department, courseInstructor }) => (
                <Card key={`${course.id}-${semester}`} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium">{course.courseCode}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {course.title}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/faculty/courses/${course.id}?semester=${semester}`}>
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {department.name}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {courseInstructor.role}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}