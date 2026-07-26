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
  ProgramSchema,
  StudentEnrollmentSchema,
  UserSchema,
} from "@/lib/db/pg/schema.pg";
import {
  calculateCumulativeGPA,
  classifyDegree,
} from "@/lib/utils/grade-calculator";
import { and, eq } from "drizzle-orm";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  GraduationCap,
  User,
} from "lucide-react";
import Link from "next/link";
import { EnrollStudentDialog } from "./enroll-student-dialog";
import { StudentAcademicActions } from "./student-academic-actions";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function StudentAcademicPage({ params }: PageProps) {
  const adminAccess = await requireAdmin();
  if (adminAccess instanceof Response) {
    return <div>Access denied. Admin privileges required.</div>;
  }

  const { id } = await params;

  // Fetch student
  const [student] = await pgDb
    .select({
      id: UserSchema.id,
      name: UserSchema.name,
      email: UserSchema.email,
      studentId: UserSchema.studentId,
      currentLevel: UserSchema.currentLevel,
      currentSemester: UserSchema.currentSemester,
      academicYear: UserSchema.academicYear,
      enrollmentStatus: UserSchema.enrollmentStatus,
      programId: UserSchema.programId,
      programName: ProgramSchema.name,
      programCode: ProgramSchema.code,
      admissionSession: UserSchema.admissionSession,
      admissionLevel: UserSchema.admissionLevel,
      graduationDate: UserSchema.graduationDate,
    })
    .from(UserSchema)
    .leftJoin(ProgramSchema, eq(UserSchema.programId, ProgramSchema.id))
    .where(and(eq(UserSchema.id, id), eq(UserSchema.role, "student")))
    .limit(1);

  if (!student) {
    return (
      <div className="p-6">
        <p>Student not found.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/admin/students">Back to Students</Link>
        </Button>
      </div>
    );
  }

  // Fetch enrollments
  const enrollments = await pgDb
    .select({
      id: StudentEnrollmentSchema.id,
      courseId: StudentEnrollmentSchema.courseId,
      courseCode: CourseSchema.courseCode,
      courseTitle: CourseSchema.title,
      credits: CourseSchema.credits,
      semester: StudentEnrollmentSchema.semester,
      academicYear: StudentEnrollmentSchema.academicYear,
      status: StudentEnrollmentSchema.status,
      finalGrade: StudentEnrollmentSchema.finalGrade,
      gradePoints: StudentEnrollmentSchema.gradePoints,
      enrollmentDate: StudentEnrollmentSchema.enrollmentDate,
    })
    .from(StudentEnrollmentSchema)
    .innerJoin(
      CourseSchema,
      eq(StudentEnrollmentSchema.courseId, CourseSchema.id),
    )
    .where(eq(StudentEnrollmentSchema.studentId, id))
    .orderBy(
      StudentEnrollmentSchema.academicYear,
      StudentEnrollmentSchema.semester,
    );

  // Carryover courses
  const failedEnrollments = enrollments.filter((e) => e.status === "failed");
  const completedCourseIds = new Set(
    enrollments.filter((e) => e.status === "completed").map((e) => e.courseId),
  );
  const carryoverCourses = failedEnrollments.filter(
    (e) => !completedCourseIds.has(e.courseId),
  );

  // CGPA
  const completedEnrollments = enrollments.filter(
    (e) => e.status === "completed" && e.gradePoints != null,
  );
  const cgpa = calculateCumulativeGPA(
    completedEnrollments.map((e) => ({
      gradePoints: Number(e.gradePoints),
      credits: e.credits,
    })),
  );
  const degreeClassification = classifyDegree(cgpa);
  const totalCreditsCompleted = completedEnrollments.reduce(
    (sum, e) => sum + e.credits,
    0,
  );

  // Fetch programs for the override dropdown
  const programs = await pgDb
    .select({
      id: ProgramSchema.id,
      name: ProgramSchema.name,
      code: ProgramSchema.code,
    })
    .from(ProgramSchema)
    .where(eq(ProgramSchema.isActive, true));

  const statusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "enrolled":
        return "outline";
      case "failed":
        return "destructive";
      case "dropped":
      case "withdrawn":
        return "secondary";
      default:
        return "outline";
    }
  };

  const gradeColor = (grade: string | null) => {
    if (!grade) return "";
    if (grade === "A" || grade === "B") return "text-emerald-600";
    if (grade === "C") return "text-amber-600";
    if (grade === "D" || grade === "E") return "text-amber-600";
    if (grade === "F") return "text-destructive";
    return "";
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/students">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Academic Record</h1>
          <p className="text-muted-foreground">
            {student.name} ({student.studentId ?? "No Student ID"})
          </p>
        </div>
      </div>

      {/* Student Header Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{student.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium text-sm">{student.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Student ID</p>
                <code className="text-sm bg-muted px-2 py-0.5 rounded">
                  {student.studentId ?? "N/A"}
                </code>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Program</p>
                <p className="font-medium">
                  {student.programName
                    ? `${student.programName} (${student.programCode})`
                    : "Not Assigned"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Academic State + CGPA */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Academic State
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Current Level</p>
                <p className="text-xl font-bold">
                  {student.currentLevel ? `${student.currentLevel}L` : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Current Semester
                </p>
                <p className="text-xl font-bold capitalize">
                  {student.currentSemester ?? "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Academic Year</p>
                <p className="text-xl font-bold">
                  {student.academicYear ?? "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Enrollment Status
                </p>
                <Badge
                  variant={
                    student.enrollmentStatus === "active"
                      ? "default"
                      : student.enrollmentStatus === "graduated"
                        ? "secondary"
                        : "destructive"
                  }
                  className="capitalize"
                >
                  {student.enrollmentStatus ?? "N/A"}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Admission Session
                </p>
                <p className="font-medium">
                  {student.admissionSession ?? "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Admission Level</p>
                <p className="font-medium">
                  {student.admissionLevel
                    ? `${student.admissionLevel}L`
                    : "N/A"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              CGPA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-center">
              <p className="text-4xl font-bold">{cgpa.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">/ 5.00</p>
            </div>
            <Badge
              variant="outline"
              className="w-full justify-center text-sm py-1"
            >
              {degreeClassification}
            </Badge>
            <div className="text-center text-sm text-muted-foreground">
              {totalCreditsCompleted} credits completed
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Manual Override Actions */}
      <StudentAcademicActions
        studentId={id}
        currentLevel={student.currentLevel}
        currentSemester={student.currentSemester}
        academicYear={student.academicYear}
        enrollmentStatus={student.enrollmentStatus}
        programId={student.programId}
        programs={programs}
      />

      {/* Enrollment History */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle>Enrollment History</CardTitle>
            <CardDescription>
              {enrollments.length} enrollment
              {enrollments.length !== 1 ? "s" : ""} total
            </CardDescription>
          </div>
          <EnrollStudentDialog
            studentId={id}
            academicYear={student.academicYear}
            enrollments={enrollments.map((e) => ({
              id: e.id,
              courseCode: e.courseCode,
              courseTitle: e.courseTitle,
              semester: e.semester,
              academicYear: e.academicYear,
              status: e.status,
              finalGrade: e.finalGrade,
            }))}
          />
        </CardHeader>
        <CardContent>
          {enrollments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No enrollments found.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course Code</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Semester</TableHead>
                  <TableHead>Academic Year</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Grade Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrollments.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono font-medium">
                      {e.courseCode}
                    </TableCell>
                    <TableCell>{e.courseTitle}</TableCell>
                    <TableCell>{e.credits}</TableCell>
                    <TableCell className="capitalize">{e.semester}</TableCell>
                    <TableCell>{e.academicYear}</TableCell>
                    <TableCell>
                      <Badge variant={statusColor(e.status)}>{e.status}</Badge>
                    </TableCell>
                    <TableCell className={gradeColor(e.finalGrade)}>
                      {e.finalGrade ?? "—"}
                    </TableCell>
                    <TableCell>{e.gradePoints ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Carryover Courses */}
      {carryoverCourses.length > 0 && (
        <Card className="border-amber-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
              Carryover Courses
            </CardTitle>
            <CardDescription>
              Failed courses that have not been successfully re-attempted
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course Code</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Semester Failed</TableHead>
                  <TableHead>Academic Year</TableHead>
                  <TableHead>Grade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {carryoverCourses.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono font-medium">
                      {e.courseCode}
                    </TableCell>
                    <TableCell>{e.courseTitle}</TableCell>
                    <TableCell>{e.credits}</TableCell>
                    <TableCell className="capitalize">{e.semester}</TableCell>
                    <TableCell>{e.academicYear}</TableCell>
                    <TableCell className="text-destructive">
                      {e.finalGrade ?? "F"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
