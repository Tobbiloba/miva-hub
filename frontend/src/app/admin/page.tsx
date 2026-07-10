import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import {
  Activity,
  BarChart3,
  BookOpen,
  Building2,
  FileText,
  TrendingUp,
  Upload,
  UserCheck,
  Users,
} from "lucide-react";
import Link from "next/link";

export default async function AdminDashboard() {
  const stats = await pgAcademicRepository.getSystemStats();
  const recentAnnouncements = await pgAcademicRepository.getAnnouncements(
    undefined,
    undefined,
    5,
  );
  const departments = await pgAcademicRepository.getDepartments();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">University Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage your academic institution efficiently
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/admin/content/upload">
              <Upload className="mr-2 h-4 w-4" />
              Upload Content
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/analytics">
              <BarChart3 className="mr-2 h-4 w-4" />
              View Analytics
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard
          icon={<Users />}
          label="Total Students"
          value={stats.students}
          caption="Enrolled students"
        />
        <StatCard
          icon={<BookOpen />}
          label="Active Courses"
          value={stats.courses}
          caption="Current semester"
        />
        <StatCard
          icon={<Building2 />}
          label="Departments"
          value={stats.departments}
          caption="Academic departments"
        />
        <StatCard
          icon={<UserCheck />}
          label="Faculty Members"
          value={stats.faculty}
          caption="Active faculty"
        />
        <StatCard
          icon={<FileText />}
          label="Course Materials"
          value={stats.materials}
          caption="Uploaded content"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild className="w-full justify-start">
              <Link href="/admin/content/upload">
                <Upload className="mr-2 h-4 w-4" />
                Upload Course Materials
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/admin/courses">
                <BookOpen className="mr-2 h-4 w-4" />
                Manage Courses
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/admin/students">
                <Users className="mr-2 h-4 w-4" />
                Student Management
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/admin/faculty">
                <UserCheck className="mr-2 h-4 w-4" />
                Faculty Management
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Announcements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Announcements
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentAnnouncements.length > 0 ? (
              <div className="space-y-3">
                {recentAnnouncements.map((announcement) => (
                  <div
                    key={announcement.id}
                    className="border-l-2 border-primary pl-3"
                  >
                    <p className="text-sm font-medium">{announcement.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(announcement.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                No recent announcements
              </p>
            )}
          </CardContent>
        </Card>

        {/* Departments Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Departments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {departments.length > 0 ? (
              <div className="space-y-2">
                {departments.slice(0, 4).map((dept) => (
                  <div
                    key={dept.id}
                    className="flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium">{dept.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {dept.code}
                      </p>
                    </div>
                  </div>
                ))}
                {departments.length > 4 && (
                  <Button asChild variant="link" className="w-full p-0 h-auto">
                    <Link href="/admin/departments">
                      View all {departments.length} departments
                    </Link>
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                No departments configured
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div>
                <p className="text-sm font-medium">Database</p>
                <p className="text-xs text-muted-foreground">Operational</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div>
                <p className="text-sm font-medium">Content Processing</p>
                <p className="text-xs text-muted-foreground">Available</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div>
                <p className="text-sm font-medium">MCP Server</p>
                <p className="text-xs text-muted-foreground">Connected</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
