import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, GraduationCap, FileText } from "lucide-react";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { pgDb } from "@/lib/db/pg/db.pg";
import {
  ProgramSchema,
  ProgramCurriculumSchema,
  CourseSchema,
  DepartmentSchema,
} from "@/lib/db/pg/schema.pg";
import { eq, asc } from "drizzle-orm";
import { AddCourseDialog } from "./add-course-dialog";
import { RemoveCourseButton } from "./remove-course-button";

interface CurriculumEntry {
  id: string;
  courseId: string;
  courseCode: string;
  courseTitle: string;
  credits: number;
  level: number;
  semester: "first" | "second";
  isCompulsory: boolean;
  orderInSemester: number | null;
}

const DEFAULT_LEVELS = [100, 200, 300, 400];
const SEMESTERS: ("first" | "second")[] = ["first", "second"];

export default async function CurriculumPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const adminAccess = await requireAdmin();
  if (adminAccess instanceof Response) {
    return <div>Access denied. Admin privileges required.</div>;
  }

  const { id: programId } = await params;

  // Fetch program with department
  const [program] = await pgDb
    .select({
      id: ProgramSchema.id,
      code: ProgramSchema.code,
      name: ProgramSchema.name,
      departmentId: ProgramSchema.departmentId,
      departmentName: DepartmentSchema.name,
    })
    .from(ProgramSchema)
    .innerJoin(
      DepartmentSchema,
      eq(ProgramSchema.departmentId, DepartmentSchema.id)
    )
    .where(eq(ProgramSchema.id, programId))
    .limit(1);

  if (!program) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold">Program not found</h1>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/admin/programs">Back to Programs</Link>
        </Button>
      </div>
    );
  }

  // Fetch curriculum entries with course info
  const entries: CurriculumEntry[] = await pgDb
    .select({
      id: ProgramCurriculumSchema.id,
      courseId: ProgramCurriculumSchema.courseId,
      courseCode: CourseSchema.courseCode,
      courseTitle: CourseSchema.title,
      credits: CourseSchema.credits,
      level: ProgramCurriculumSchema.level,
      semester: ProgramCurriculumSchema.semester,
      isCompulsory: ProgramCurriculumSchema.isCompulsory,
      orderInSemester: ProgramCurriculumSchema.orderInSemester,
    })
    .from(ProgramCurriculumSchema)
    .innerJoin(
      CourseSchema,
      eq(ProgramCurriculumSchema.courseId, CourseSchema.id)
    )
    .where(eq(ProgramCurriculumSchema.programId, programId))
    .orderBy(
      asc(ProgramCurriculumSchema.level),
      asc(ProgramCurriculumSchema.orderInSemester)
    );

  // Fetch all courses for the add dialog (filtered by program's department)
  const allCourses = await pgDb
    .select({
      id: CourseSchema.id,
      courseCode: CourseSchema.courseCode,
      title: CourseSchema.title,
      credits: CourseSchema.credits,
    })
    .from(CourseSchema)
    .where(eq(CourseSchema.departmentId, program.departmentId))
    .orderBy(asc(CourseSchema.courseCode));

  // Determine which levels to show: default 100-400, plus 500 if any entries exist there
  const entryLevels = new Set(entries.map((e) => e.level));
  const levels = [...DEFAULT_LEVELS];
  if (entryLevels.has(500) && !levels.includes(500)) {
    levels.push(500);
  }

  // Group entries by level+semester for the grid
  const grid: Record<string, CurriculumEntry[]> = {};
  for (const level of levels) {
    for (const sem of SEMESTERS) {
      grid[`${level}-${sem}`] = [];
    }
  }
  for (const entry of entries) {
    const key = `${entry.level}-${entry.semester}`;
    if (grid[key]) {
      grid[key].push(entry);
    }
  }

  // Stats
  const totalCourses = entries.length;
  const compulsoryCount = entries.filter((e) => e.isCompulsory).length;
  const electiveCount = totalCourses - compulsoryCount;
  const totalCredits = entries.reduce((sum, e) => sum + e.credits, 0);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="icon">
          <Link href="/admin/programs">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">
            {program.name} ({program.code})
          </h1>
          <p className="text-muted-foreground">
            {program.departmentName} — Curriculum Mapping
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Courses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-muted-foreground" />
              <span className="text-3xl font-bold">{totalCourses}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Compulsory</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <span className="text-3xl font-bold">{compulsoryCount}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Electives</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-muted-foreground" />
              <span className="text-3xl font-bold">{electiveCount}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Credits</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-muted-foreground" />
              <span className="text-3xl font-bold">{totalCredits}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Curriculum Grid: Levels × Semesters */}
      <div className="space-y-4">
        {levels.map((level) => (
          <div key={level} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SEMESTERS.map((sem) => {
              const cellKey = `${level}-${sem}`;
              const cellEntries = grid[cellKey] || [];
              const cellCourseIds = cellEntries.map((e) => e.courseId);

              return (
                <Card key={cellKey}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>
                        {level}L — {sem === "first" ? "First" : "Second"}{" "}
                        Semester
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {cellEntries.length} course
                        {cellEntries.length !== 1 ? "s" : ""}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {cellEntries.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-3">
                        No courses mapped yet
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {cellEntries.map((entry) => (
                          <div
                            key={entry.id}
                            className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-mono font-medium shrink-0">
                                {entry.courseCode}
                              </span>
                              <span className="text-muted-foreground truncate">
                                {entry.courseTitle}
                              </span>
                              <Badge
                                variant={
                                  entry.isCompulsory ? "default" : "secondary"
                                }
                                className="shrink-0 text-xs"
                              >
                                {entry.isCompulsory
                                  ? "Compulsory"
                                  : "Elective"}
                              </Badge>
                              <span className="text-xs text-muted-foreground shrink-0">
                                {entry.credits}cr
                              </span>
                            </div>
                            <RemoveCourseButton
                              programId={programId}
                              curriculumId={entry.id}
                              courseCode={entry.courseCode}
                              level={level}
                              semester={sem}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    <AddCourseDialog
                      programId={programId}
                      level={level}
                      semester={sem}
                      courses={allCourses}
                      existingCourseIds={cellCourseIds}
                    />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
