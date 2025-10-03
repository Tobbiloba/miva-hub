import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Building2,
  Plus,
  Edit,
  Trash2,
  Users,
  BookOpen,
  Calendar,
  Search,
  Filter
} from "lucide-react";
import { getSession } from "@/lib/auth/server";
import { requireAdmin } from "@/lib/auth/admin";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import { 
  DepartmentManagementClient,
  EditDepartmentDialog,
  DeleteDepartmentDialog 
} from "@/components/admin/department-management-client";

export default async function DepartmentManagementPage() {
  const session = await getSession();
  const adminAccess = await requireAdmin();

  if (adminAccess instanceof Response) {
    return <div>Access denied. Admin privileges required.</div>;
  }

  // Fetch departments and related data
  const [departments, courseAnalytics, facultyAnalytics] = await Promise.all([
    pgAcademicRepository.getDepartments(),
    // Get course analytics for each department
    (async () => {
      const depts = await pgAcademicRepository.getDepartments();
      const analytics = await Promise.all(
        depts.map(async (dept) => {
          const courses = await pgAcademicRepository.getCoursesByDepartment(dept.id);
          const faculty = await pgAcademicRepository.getFacultyByDepartment(dept.id);
          return {
            departmentId: dept.id,
            totalCourses: courses.length,
            totalFaculty: faculty.length,
            activeCourses: courses.filter(c => c.isActive).length
          };
        })
      );
      return analytics;
    })(),
    // Get faculty analytics
    (async () => {
      const depts = await pgAcademicRepository.getDepartments();
      const analytics = await Promise.all(
        depts.map(async (dept) => {
          const faculty = await pgAcademicRepository.getFacultyByDepartment(dept.id);
          return {
            departmentId: dept.id,
            faculty: faculty.map(f => ({
              id: f.id,
              name: f.name,
              position: f.position,
              email: f.email
            }))
          };
        })
      );
      return analytics;
    })()
  ]);

  // Merge data for comprehensive department view
  const departmentsWithAnalytics = departments.map(dept => {
    const courseAnalytic = courseAnalytics.find(ca => ca.departmentId === dept.id);
    const facultyAnalytic = facultyAnalytics.find(fa => fa.departmentId === dept.id);
    
    return {
      ...dept,
      totalCourses: courseAnalytic?.totalCourses || 0,
      activeCourses: courseAnalytic?.activeCourses || 0,
      totalFaculty: courseAnalytic?.totalFaculty || 0,
      faculty: facultyAnalytic?.faculty || []
    };
  });

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-8 w-8 text-blue-600" />
            Department Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage academic departments, courses, and faculty assignments
          </p>
        </div>
        
        <DepartmentManagementClient>
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Department
          </Button>
        </DepartmentManagementClient>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{departments.length}</p>
                <p className="text-xs text-muted-foreground">Total Departments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">
                  {courseAnalytics.reduce((sum, ca) => sum + ca.totalCourses, 0)}
                </p>
                <p className="text-xs text-muted-foreground">Total Courses</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">
                  {facultyAnalytics.reduce((sum, fa) => sum + fa.faculty.length, 0)}
                </p>
                <p className="text-xs text-muted-foreground">Total Faculty</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">
                  {courseAnalytics.reduce((sum, ca) => sum + ca.activeCourses, 0)}
                </p>
                <p className="text-xs text-muted-foreground">Active Courses</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search departments..." className="pl-10" />
              </div>
            </div>
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Departments Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {departmentsWithAnalytics.map((department) => (
          <Card key={department.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-xl">{department.name}</CardTitle>
                  <CardDescription className="mt-1">
                    {department.code} • Department
                  </CardDescription>
                </div>
                <div className="flex gap-1">
                  <EditDepartmentDialog department={department}>
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </EditDepartmentDialog>
                  <DeleteDepartmentDialog department={department}>
                    <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </DeleteDepartmentDialog>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Department Description */}
              {department.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {department.description}
                </p>
              )}
              
              {/* Statistics */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-lg font-bold text-blue-600">{department.totalCourses}</p>
                  <p className="text-xs text-muted-foreground">Courses</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-green-600">{department.totalFaculty}</p>
                  <p className="text-xs text-muted-foreground">Faculty</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-purple-600">{department.activeCourses}</p>
                  <p className="text-xs text-muted-foreground">Active</p>
                </div>
              </div>

              {/* Faculty Preview */}
              {department.faculty.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Faculty Members</h4>
                  <div className="space-y-1">
                    {department.faculty.slice(0, 3).map((faculty) => (
                      <div key={faculty.id} className="flex items-center justify-between text-xs">
                        <span className="font-medium">{faculty.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {faculty.position}
                        </Badge>
                      </div>
                    ))}
                    {department.faculty.length > 3 && (
                      <p className="text-xs text-muted-foreground">
                        +{department.faculty.length - 3} more faculty members
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 border-t">
                <Button variant="outline" size="sm" className="flex-1">
                  <BookOpen className="mr-2 h-3 w-3" />
                  View Courses
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <Users className="mr-2 h-3 w-3" />
                  View Faculty
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {departments.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Departments Yet</h3>
            <p className="text-muted-foreground mb-4">
              Get started by creating your first academic department.
            </p>
            <DepartmentManagementClient>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add First Department
              </Button>
            </DepartmentManagementClient>
          </CardContent>
        </Card>
      )}
    </div>
  );
}