"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WeeklyContentBuilder } from "@/components/admin/weekly-content-builder";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Plus,
  Settings,
  CheckCircle,
  Clock,
  AlertCircle,
  List,
  Grid,
  Loader2,
  FileText,
  Users,
  BarChart3
} from "lucide-react";
import Link from "next/link";
import { CourseEntity, CourseWeekEntity } from "@/lib/db/pg/schema.pg";

interface CourseWithDepartment extends CourseEntity {
  department: {
    id: string;
    name: string;
    code: string;
  };
}

export default function CourseContentManagementPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;
  const [course, setCourse] = useState<CourseWithDepartment | null>(null);
  const [courseWeeks, setCourseWeeks] = useState<CourseWeekEntity[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const { toast } = useToast();

  // Load course data and weeks
  useEffect(() => {
    const loadCourseData = async () => {
      try {
        setIsLoading(true);

        // Load course details
        const courseResponse = await fetch(`/api/admin/courses/${courseId}`);
        const courseData = await courseResponse.json();

        if (!courseData.success) {
          throw new Error(courseData.message || "Failed to load course");
        }

        setCourse(courseData.data);

        // Load course weeks
        const weeksResponse = await fetch(`/api/admin/course-weeks?courseId=${courseId}`);
        const weeksData = await weeksResponse.json();

        if (weeksData.success && weeksData.data.length > 0) {
          setCourseWeeks(weeksData.data);
        } else {
          // If no weeks exist, create default weeks based on totalWeeks
          const totalWeeks = courseData.data.totalWeeks || 16;
          await createDefaultWeeks(totalWeeks);
        }

      } catch (error) {
        console.error('Error loading course data:', error);
        toast({
          title: "Error",
          description: "Failed to load course data",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (courseId) {
      loadCourseData();
    }
  }, [courseId]);

  const createDefaultWeeks = async (totalWeeks: number) => {
    try {
      const weeks: CourseWeekEntity[] = [];
      
      for (let i = 1; i <= totalWeeks; i++) {
        const response = await fetch('/api/admin/course-weeks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseId,
            weekNumber: i,
            title: `Week ${i}`,
            description: `Content for week ${i}`,
            learningObjectives: JSON.stringify([]),
            topics: JSON.stringify([])
          }),
        });

        if (response.ok) {
          const data = await response.json();
          weeks.push(data.data);
        }
      }

      setCourseWeeks(weeks);
    } catch (error) {
      console.error('Error creating default weeks:', error);
      toast({
        title: "Error", 
        description: "Failed to create course weeks",
        variant: "destructive"
      });
    }
  };

  const handleWeekUpdate = (updatedWeek: CourseWeekEntity) => {
    setCourseWeeks(prev => 
      prev.map(week => 
        week.id === updatedWeek.id ? updatedWeek : week
      )
    );
  };

  const getWeekProgress = (week: CourseWeekEntity) => {
    // This would normally come from the content count
    // For now, just check if week has content
    const hasTitle = week.title !== `Week ${week.weekNumber}`;
    const hasDescription = !!week.description;
    const hasObjectives = week.learningObjectives && JSON.parse(week.learningObjectives).length > 0;
    
    const completedItems = [hasTitle, hasDescription, hasObjectives].filter(Boolean).length;
    return Math.round((completedItems / 3) * 100);
  };

  const getWeekStatus = (week: CourseWeekEntity) => {
    const progress = getWeekProgress(week);
    if (progress === 100) return 'completed';
    if (progress > 0) return 'in-progress';
    return 'not-started';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircle;
      case 'in-progress': return Clock;
      default: return AlertCircle;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'in-progress': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-bold mb-2">Course Not Found</h1>
          <p className="text-muted-foreground mb-4">
            The course you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission to access it.
          </p>
          <Link href="/admin/courses">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Courses
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const selectedWeekData = courseWeeks.find(week => week.weekNumber === selectedWeek);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/admin/courses">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            {course.courseCode}: {course.title}
          </h1>
          <p className="text-muted-foreground">
            {course.department.name} • {course.credits} credits • {courseWeeks.length} weeks
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Users className="h-4 w-4 mr-2" />
            Enrollments
          </Button>
          <Button variant="outline" size="sm">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </Button>
        </div>
      </div>

      {/* Course Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Course Overview
          </CardTitle>
          <CardDescription>
            Manage content structure and weekly planning for your course
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{courseWeeks.length}</div>
              <div className="text-sm text-muted-foreground">Total Weeks</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {courseWeeks.filter(week => getWeekStatus(week) === 'completed').length}
              </div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {courseWeeks.filter(week => getWeekStatus(week) === 'in-progress').length}
              </div>
              <div className="text-sm text-muted-foreground">In Progress</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {courseWeeks.filter(week => week.isPublished).length}
              </div>
              <div className="text-sm text-muted-foreground">Published</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-4">
        {/* Week Navigation */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Course Weeks
                </CardTitle>
                <div className="flex gap-1">
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto">
                {courseWeeks.map((week) => {
                  const status = getWeekStatus(week);
                  const StatusIcon = getStatusIcon(status);
                  const progress = getWeekProgress(week);
                  
                  return (
                    <button
                      key={week.id}
                      onClick={() => setSelectedWeek(week.weekNumber)}
                      className={`w-full p-3 text-left border-b hover:bg-muted/50 transition-colors ${
                        selectedWeek === week.weekNumber ? 'bg-muted' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`p-1 rounded ${getStatusColor(status)}`}>
                            <StatusIcon className="h-3 w-3" />
                          </div>
                          <div>
                            <div className="font-medium text-sm">Week {week.weekNumber}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {week.title}
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {progress}%
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Week Content Editor */}
        <div className="lg:col-span-3">
          {selectedWeekData ? (
            <WeeklyContentBuilder
              courseId={courseId}
              courseTitle={course.title}
              weekData={selectedWeekData}
              onWeekUpdate={handleWeekUpdate}
            />
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">Select a Week</h3>
                  <p className="text-muted-foreground">
                    Choose a week from the sidebar to start managing its content
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}