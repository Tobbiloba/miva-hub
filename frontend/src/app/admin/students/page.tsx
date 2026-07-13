import { StudentManagementClient } from "@/components/admin/student-management-client";
import { VolunteerToggle } from "@/components/admin/volunteer-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import {
  CourseSchema,
  StudentEnrollmentSchema,
  UserSchema,
} from "@/lib/db/pg/schema.pg";
import { getUserUniversity } from "@/lib/tenant";
import { and, eq, sql } from "drizzle-orm";
import {
  BookOpen,
  Calendar,
  CheckCircle,
  Download,
  Edit,
  Filter,
  GraduationCap,
  Mail,
  Plus,
  Search,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";

export default async function StudentManagementPage() {
  const adminAccess = await requireAdmin();

  if (adminAccess instanceof Response) {
    return <div>Access denied. Admin privileges required.</div>;
  }

  // Tenant scope: admins only see their own university's students
  const university = await getUserUniversity(adminAccess.user.id);

  // Fetch students and their academic data
  const [students] = await Promise.all([
    // Get all students with their enrollment information
    pgDb
      .select({
        user: UserSchema,
        enrollmentCount: sql<number>`count(${StudentEnrollmentSchema.id})`.as(
          "enrollmentCount",
        ),
      })
      .from(UserSchema)
      .leftJoin(
        StudentEnrollmentSchema,
        eq(UserSchema.id, StudentEnrollmentSchema.studentId),
      )
      .where(
        university
          ? and(
              eq(UserSchema.role, "student"),
              eq(UserSchema.universityId, university.id),
            )
          : eq(UserSchema.role, "student"),
      )
      .groupBy(UserSchema.id)
      .orderBy(UserSchema.createdAt),

    // Get system statistics
    pgAcademicRepository.getSystemStats(),

    // Get departments for filtering (scoped to the admin's university)
    pgAcademicRepository.getDepartments(university?.id),
  ]);

  // Get detailed enrollment information for each student
  const studentsWithDetails = await Promise.all(
    students.map(async ({ user, enrollmentCount }) => {
      try {
        // Get current semester enrollments
        const currentEnrollments = await pgDb
          .select({
            enrollment: StudentEnrollmentSchema,
            course: CourseSchema,
          })
          .from(StudentEnrollmentSchema)
          .innerJoin(
            CourseSchema,
            eq(StudentEnrollmentSchema.courseId, CourseSchema.id),
          )
          .where(
            and(
              eq(StudentEnrollmentSchema.studentId, user.id),
              eq(StudentEnrollmentSchema.status, "enrolled"),
            ),
          );

        // Calculate GPA and academic standing (simplified)
        const academicStanding = enrollmentCount > 0 ? "active" : "inactive";
        const currentGPA = 3.2; // Placeholder - would calculate from actual grades

        return {
          ...user,
          enrollmentCount: Number(enrollmentCount) || 0,
          currentEnrollments,
          academicStanding,
          currentGPA,
          totalCredits: currentEnrollments.reduce(
            (sum, e) => sum + (e.course.credits || 0),
            0,
          ),
        };
      } catch (error) {
        console.error(`Error fetching details for student ${user.id}:`, error);
        return {
          ...user,
          enrollmentCount: Number(enrollmentCount) || 0,
          currentEnrollments: [],
          academicStanding: "inactive" as const,
          currentGPA: 0,
          totalCredits: 0,
        };
      }
    }),
  );

  // Calculate statistics
  const activeStudents = studentsWithDetails.filter(
    (s) => s.academicStanding === "active",
  ).length;
  const totalEnrollments = studentsWithDetails.reduce(
    (sum, s) => sum + s.enrollmentCount,
    0,
  );
  const averageGPA =
    studentsWithDetails.length > 0
      ? studentsWithDetails.reduce((sum, s) => sum + s.currentGPA, 0) /
        studentsWithDetails.length
      : 0;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8 text-blue-600" />
            Student Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage student records, enrollments, and academic progress
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export Students
          </Button>
          <StudentManagementClient>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Student
            </Button>
          </StudentManagementClient>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">
                  {studentsWithDetails.length}
                </p>
                <p className="text-xs text-muted-foreground">Total Students</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{activeStudents}</p>
                <p className="text-xs text-muted-foreground">Active Students</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{totalEnrollments}</p>
                <p className="text-xs text-muted-foreground">
                  Total Enrollments
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">{averageGPA.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Average GPA</p>
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
                <Input
                  placeholder="Search students by name, email, or student ID..."
                  className="pl-10"
                />
              </div>
            </div>
            <Select>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Academic Standing" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Students</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="graduated">Graduated</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Academic Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                <SelectItem value="100">100 Level</SelectItem>
                <SelectItem value="200">200 Level</SelectItem>
                <SelectItem value="300">300 Level</SelectItem>
                <SelectItem value="400">400 Level</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              More Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card>
        <CardHeader>
          <CardTitle>Student Records</CardTitle>
          <CardDescription>
            Complete list of registered students with their academic information
          </CardDescription>
        </CardHeader>
        <CardContent>
          {studentsWithDetails.length > 0 ? (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Academic Year</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Enrollments</TableHead>
                    <TableHead>Credits</TableHead>
                    <TableHead>GPA</TableHead>
                    <TableHead>Volunteer</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studentsWithDetails.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <Users className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium">{student.name}</p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {student.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <code className="text-sm bg-muted px-2 py-1 rounded">
                          {(student as any).studentId || "N/A"}
                        </code>
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline">
                          {(student as any).academicYear || "Not Set"} Level
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant={
                            student.academicStanding === "active"
                              ? "default"
                              : "secondary"
                          }
                          className={
                            student.academicStanding === "active"
                              ? "bg-green-100 text-green-800 border-green-200"
                              : ""
                          }
                        >
                          {student.academicStanding}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1">
                          <BookOpen className="h-4 w-4 text-muted-foreground" />
                          <span>{student.enrollmentCount}</span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <span className="font-medium">
                          {student.totalCredits}
                        </span>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1">
                          <TrendingUp
                            className={`h-4 w-4 ${student.currentGPA >= 3.0 ? "text-green-600" : "text-orange-600"}`}
                          />
                          <span
                            className={
                              student.currentGPA >= 3.0
                                ? "text-green-600 font-medium"
                                : "text-orange-600"
                            }
                          >
                            {student.currentGPA.toFixed(2)}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <VolunteerToggle
                          studentId={student.id}
                          studentName={student.name}
                          initialValue={Boolean((student as any).isVolunteer)}
                        />
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(student.createdAt).toLocaleDateString()}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" asChild>
                            <Link
                              href={`/admin/students/${student.id}/academic`}
                              title="Academic Record"
                            >
                              <GraduationCap className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Students Found</h3>
              <p className="text-muted-foreground mb-4">
                No students have been registered yet.
              </p>
              <StudentManagementClient>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Student
                </Button>
              </StudentManagementClient>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
