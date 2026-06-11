import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth/admin";
import { pgDb } from "@/lib/db/pg/db.pg";
import {
  CourseSchema,
  DepartmentSchema,
  FacultySchema,
  UserSchema,
} from "@/lib/db/pg/schema.pg";
import { getUserUniversity } from "@/lib/tenant";
import { and, eq, sql } from "drizzle-orm";
import {
  BookOpen,
  Building,
  Calendar,
  GraduationCap,
  Mail,
  MapPin,
  Plus,
  UserCheck,
} from "lucide-react";
import Link from "next/link";

export default async function FacultyManagementPage() {
  const adminAccess = await requireAdmin();

  if (adminAccess instanceof Response) {
    return <div>Access denied. Admin privileges required.</div>;
  }

  // Tenant scope: admins only see their own university's faculty
  const university = await getUserUniversity(adminAccess.user.id);

  // Fetch faculty and their data
  const facultyData = await pgDb
    .select({
      user: UserSchema,
      faculty: FacultySchema,
      department: DepartmentSchema,
      courseCount: sql<number>`count(${CourseSchema.id})`.as("courseCount"),
    })
    .from(UserSchema)
    .leftJoin(FacultySchema, eq(UserSchema.id, FacultySchema.userId))
    .leftJoin(
      DepartmentSchema,
      eq(FacultySchema.departmentId, DepartmentSchema.id),
    )
    .leftJoin(CourseSchema, eq(FacultySchema.id, CourseSchema.instructorId))
    .where(
      university
        ? and(
            eq(UserSchema.role, "faculty"),
            eq(UserSchema.universityId, university.id),
          )
        : eq(UserSchema.role, "faculty"),
    )
    .groupBy(UserSchema.id, FacultySchema.id, DepartmentSchema.id)
    .orderBy(UserSchema.createdAt);

  // Get detailed faculty information
  const facultyWithDetails = facultyData.map(
    ({ user, faculty, department, courseCount }) => ({
      ...user,
      faculty: faculty
        ? {
            id: faculty.id,
            position: faculty.position,
            departmentId: faculty.departmentId,
            office: faculty.office,
            officeHours: faculty.officeHours,
            bio: faculty.bio,
            qualifications: faculty.qualifications || [],
            researchInterests: faculty.researchInterests || [],
            isActive: faculty.isActive,
          }
        : null,
      department: department
        ? {
            id: department.id,
            name: department.name,
            code: department.code,
          }
        : null,
      courseCount: Number(courseCount) || 0,
      // Remove password from client-side data
      password: undefined,
    }),
  );

  // Calculate statistics
  const activeFaculty = facultyWithDetails.filter(
    (f) => f.faculty?.isActive,
  ).length;
  const totalCourses = facultyWithDetails.reduce(
    (sum, f) => sum + f.courseCount,
    0,
  );
  const averageCoursesPerFaculty =
    facultyWithDetails.length > 0
      ? totalCourses / facultyWithDetails.length
      : 0;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-purple-600" />
            Faculty Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage faculty members, their profiles, and course assignments
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex items-center gap-2" asChild>
            <Link href="/admin/faculty/invites">
              <Mail className="h-4 w-4" />
              Invites
            </Link>
          </Button>
          <Button className="flex items-center gap-2" asChild>
            <Link href="/admin/faculty/create">
              <Plus className="h-4 w-4" />
              Add Faculty
            </Link>
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">
                  {facultyWithDetails.length}
                </p>
                <p className="text-xs text-muted-foreground">Total Faculty</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{activeFaculty}</p>
                <p className="text-xs text-muted-foreground">Active Faculty</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{totalCourses}</p>
                <p className="text-xs text-muted-foreground">Total Courses</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Building className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">
                  {averageCoursesPerFaculty.toFixed(1)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Avg Courses/Faculty
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Faculty Table */}
      <Card>
        <CardHeader>
          <CardTitle>Faculty Directory</CardTitle>
          <CardDescription>
            Complete list of faculty members with their profiles and course
            assignments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {facultyWithDetails.length > 0 ? (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Faculty Member</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Office</TableHead>
                    <TableHead>Courses</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {facultyWithDetails.map((faculty) => (
                    <TableRow key={faculty.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                            <GraduationCap className="h-4 w-4 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-medium">{faculty.name}</p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {faculty.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline">
                          {faculty.faculty?.position || "Not Set"}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        {faculty.department ? (
                          <div className="flex items-center gap-1">
                            <Building className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              {faculty.department.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            No Department
                          </span>
                        )}
                      </TableCell>

                      <TableCell>
                        {faculty.faculty?.office ? (
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span>{faculty.faculty.office}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            Not Set
                          </span>
                        )}
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1">
                          <BookOpen className="h-4 w-4 text-muted-foreground" />
                          <span>{faculty.courseCount}</span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant={
                            faculty.faculty?.isActive ? "default" : "secondary"
                          }
                          className={
                            faculty.faculty?.isActive
                              ? "bg-green-100 text-green-800 border-green-200"
                              : ""
                          }
                        >
                          {faculty.faculty?.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(faculty.createdAt).toLocaleDateString()}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Faculty Found</h3>
              <p className="text-muted-foreground mb-4">
                No faculty members have been registered yet.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
