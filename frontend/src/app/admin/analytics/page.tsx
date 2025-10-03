import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  BookOpen,
  GraduationCap,
  Building2,
  FileText,
  BarChart3
} from "lucide-react";
import { getSession } from "@/lib/auth/server";
import { requireAdmin } from "@/lib/auth/admin";
import {
  getSystemOverview,
  getCourseAnalytics,
  getLearningInsights,
  getDepartmentAnalytics,
  getFacultyAnalytics,
  getRealTimeStats
} from "@/lib/analytics/academic-analytics";
import { AnalyticsDashboard } from "@/components/admin/analytics-dashboard";

export default async function AnalyticsPage() {
  const session = await getSession();
  const adminAccess = await requireAdmin();

  if (adminAccess instanceof Response) {
    return <div>Access denied. Admin privileges required.</div>;
  }

  // Fetch all analytics data
  const [
    systemOverview,
    courseAnalytics,
    learningInsights,
    departmentAnalytics,
    facultyAnalytics,
    realTimeStats
  ] = await Promise.all([
    getSystemOverview(),
    getCourseAnalytics(),
    getLearningInsights(),
    getDepartmentAnalytics(),
    getFacultyAnalytics(),
    getRealTimeStats()
  ]);

  // Prepare analytics data for the client component
  const analyticsData = {
    systemOverview,
    courseAnalytics,
    learningInsights,
    departmentAnalytics,
    facultyAnalytics,
    realTimeStats
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-blue-600" />
            Academic Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive insights into MIVA University academic performance
          </p>
        </div>
      </div>

      {/* System Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{systemOverview.totalStudents}</p>
                <p className="text-xs text-muted-foreground">Students</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{systemOverview.totalCourses}</p>
                <p className="text-xs text-muted-foreground">Active Courses</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{systemOverview.totalFaculty}</p>
                <p className="text-xs text-muted-foreground">Faculty</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">{systemOverview.totalDepartments}</p>
                <p className="text-xs text-muted-foreground">Departments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-600" />
              <div>
                <p className="text-2xl font-bold">{systemOverview.totalMaterials}</p>
                <p className="text-xs text-muted-foreground">Materials</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Interactive Analytics Dashboard */}
      <AnalyticsDashboard initialData={analyticsData} />
    </div>
  );
}