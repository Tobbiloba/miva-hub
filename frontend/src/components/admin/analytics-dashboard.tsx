"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Download,
  Users,
  BookOpen,
  GraduationCap,
  Building2,
  FileText,
  Activity,
  Target,
  Award,
  AlertTriangle,
  Clock,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AnalyticsDashboardProps {
  initialData: any;
}

interface RealTimeStats {
  totalStudents: number;
  totalCourses: number;
  totalFaculty: number;
  todaysActivity: {
    newSubmissions: number;
    gradesPosted: number;
    newEnrollments: number;
    activeUsers: number;
  };
}

export function AnalyticsDashboard({ initialData }: AnalyticsDashboardProps) {
  const [analyticsData, setAnalyticsData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const { toast } = useToast();

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(async () => {
      await refreshRealTimeData();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const refreshAllData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/analytics?type=all&refresh=true${selectedDepartment !== "all" ? `&departmentId=${selectedDepartment}` : ""}`);
      const result = await response.json();

      if (result.success) {
        setAnalyticsData(result.data);
        setLastUpdated(new Date());
        toast({
          title: "Data Refreshed",
          description: "Analytics data has been updated successfully.",
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: "Unable to refresh analytics data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const refreshRealTimeData = async () => {
    try {
      const response = await fetch("/api/admin/analytics?type=realtime");
      const result = await response.json();

      if (result.success) {
        setAnalyticsData(prev => ({
          ...prev,
          realTimeStats: result.data
        }));
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error("Failed to refresh real-time data:", error);
    }
  };

  const exportReport = async () => {
    try {
      const response = await fetch("/api/admin/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate_report" })
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Download the report as JSON
        const dataStr = JSON.stringify(result.report, null, 2);
        const dataBlob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `miva-analytics-report-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);

        toast({
          title: "Report Exported",
          description: "Analytics report has been downloaded successfully.",
        });
      }
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Unable to generate analytics report.",
        variant: "destructive",
      });
    }
  };

  const handleDepartmentChange = async (departmentId: string) => {
    setSelectedDepartment(departmentId);
    setIsLoading(true);

    try {
      const response = await fetch(`/api/admin/analytics?type=all${departmentId !== "all" ? `&departmentId=${departmentId}` : ""}`);
      const result = await response.json();

      if (result.success) {
        setAnalyticsData(result.data);
        setLastUpdated(new Date());
      }
    } catch (error) {
      toast({
        title: "Filter Failed",
        description: "Unable to filter by department.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select value={selectedDepartment} onValueChange={handleDepartmentChange}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {analyticsData.departmentAnalytics?.map((dept: any) => (
                <SelectItem key={dept.departmentId} value={dept.departmentId}>
                  {dept.departmentName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="text-sm text-muted-foreground">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? "bg-green-50 border-green-200" : ""}
          >
            <Activity className="mr-2 h-4 w-4" />
            {autoRefresh ? "Auto-Refresh On" : "Auto-Refresh Off"}
          </Button>

          <Button variant="outline" size="sm" onClick={exportReport}>
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={refreshAllData}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {/* Real-Time Activity Bar */}
      {analyticsData.realTimeStats && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-600" />
                <h3 className="font-medium">Live Activity</h3>
              </div>
              <div className="flex items-center gap-6">
                <RealTimeMetric
                  icon={<FileText className="h-4 w-4" />}
                  label="Submissions"
                  value={analyticsData.realTimeStats.todaysActivity.newSubmissions}
                  color="green"
                />
                <RealTimeMetric
                  icon={<GraduationCap className="h-4 w-4" />}
                  label="Grades"
                  value={analyticsData.realTimeStats.todaysActivity.gradesPosted}
                  color="blue"
                />
                <RealTimeMetric
                  icon={<Users className="h-4 w-4" />}
                  label="Enrollments"
                  value={analyticsData.realTimeStats.todaysActivity.newEnrollments}
                  color="purple"
                />
                <RealTimeMetric
                  icon={<Activity className="h-4 w-4" />}
                  label="Active Users"
                  value={analyticsData.realTimeStats.todaysActivity.activeUsers}
                  color="orange"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analytics Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="courses">Courses</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="faculty">Faculty</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        {/* Course Performance Tab */}
        <TabsContent value="courses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Course Performance Analytics
                <Badge variant="outline">
                  {analyticsData.courseAnalytics?.length || 0} courses
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analyticsData.courseAnalytics?.length > 0 ? (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {analyticsData.courseAnalytics.map((course: any) => (
                    <CourseCard key={course.courseId} course={course} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {isLoading ? "Loading course data..." : "No course analytics available"}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <PopularCoursesCard courses={analyticsData.learningInsights?.popularCourses || []} />
            <ChallengingCoursesCard courses={analyticsData.learningInsights?.difficultCourses || []} />
          </div>
          
          <PerformanceTrendsCard trends={analyticsData.learningInsights?.performanceTrends} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper Components
function RealTimeMetric({ icon, label, value, color }: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  const colorClasses = {
    green: "text-green-600 bg-green-100",
    blue: "text-blue-600 bg-blue-100",
    purple: "text-purple-600 bg-purple-100",
    orange: "text-orange-600 bg-orange-100"
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`p-1.5 rounded-full ${colorClasses[color as keyof typeof colorClasses]}`}>
        {icon}
      </div>
      <div>
        <p className="font-medium">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function CourseCard({ course }: { course: any }) {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h4 className="font-medium">{course.courseCode}</h4>
          <Badge variant="outline">{course.enrolledStudents} students</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{course.courseName}</p>
        <p className="text-xs text-muted-foreground">Faculty: {course.facultyName}</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-center">
          <p className="text-lg font-bold text-green-600">{course.averageGrade.toFixed(1)}%</p>
          <p className="text-xs text-muted-foreground">Avg Grade</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-blue-600">{course.totalAssignments}</p>
          <p className="text-xs text-muted-foreground">Assignments</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-purple-600">{course.submissionRate.toFixed(1)}%</p>
          <p className="text-xs text-muted-foreground">Submission Rate</p>
        </div>
      </div>
    </div>
  );
}

function PopularCoursesCard({ courses }: { courses: any[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" />
          Most Popular Courses
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {courses.slice(0, 5).map((course, index) => (
            <div key={course.courseCode} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center font-medium">
                  {index + 1}
                </div>
                <span className="font-medium">{course.courseCode}</span>
              </div>
              <Badge variant="secondary">{course.enrollmentCount} students</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ChallengingCoursesCard({ courses }: { courses: any[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Most Challenging Courses
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {courses.slice(0, 5).map((course, index) => (
            <div key={course.courseCode} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 text-xs flex items-center justify-center font-medium">
                  {index + 1}
                </div>
                <span className="font-medium">{course.courseCode}</span>
              </div>
              <Badge variant="outline">{course.averageGrade.toFixed(1)}% avg</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function PerformanceTrendsCard({ trends }: { trends: any }) {
  if (!trends) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Performance Trends
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="text-center p-4 border rounded-lg">
            <p className="text-2xl font-bold text-blue-600">{trends.currentSemesterAverage.toFixed(1)}%</p>
            <p className="text-sm text-muted-foreground">Current Semester</p>
          </div>
          <div className="text-center p-4 border rounded-lg">
            <p className="text-2xl font-bold text-gray-600">{trends.previousSemesterAverage.toFixed(1)}%</p>
            <p className="text-sm text-muted-foreground">Previous Semester</p>
          </div>
          <div className="text-center p-4 border rounded-lg">
            <div className="flex items-center justify-center gap-1">
              {trends.improvementRate > 0 ? (
                <TrendingUp className="h-5 w-5 text-green-600" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-600" />
              )}
              <p className={`text-2xl font-bold ${trends.improvementRate > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {Math.abs(trends.improvementRate).toFixed(1)}%
              </p>
            </div>
            <p className="text-sm text-muted-foreground">Improvement</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}