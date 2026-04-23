import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BookOpen, Building2, FileText } from "lucide-react";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { pgDb } from "@/lib/db/pg/db.pg";
import {
  ProgramSchema,
  DepartmentSchema,
  ProgramCurriculumSchema,
} from "@/lib/db/pg/schema.pg";
import { eq, sql, asc } from "drizzle-orm";

export default async function ProgramsListPage() {
  const adminAccess = await requireAdmin();
  if (adminAccess instanceof Response) {
    return <div>Access denied. Admin privileges required.</div>;
  }

  const programs = await pgDb
    .select({
      id: ProgramSchema.id,
      code: ProgramSchema.code,
      name: ProgramSchema.name,
      description: ProgramSchema.description,
      departmentId: ProgramSchema.departmentId,
      departmentName: DepartmentSchema.name,
      isActive: ProgramSchema.isActive,
      curriculumCount: sql<number>`count(${ProgramCurriculumSchema.id})`,
    })
    .from(ProgramSchema)
    .innerJoin(
      DepartmentSchema,
      eq(ProgramSchema.departmentId, DepartmentSchema.id)
    )
    .leftJoin(
      ProgramCurriculumSchema,
      eq(ProgramSchema.id, ProgramCurriculumSchema.programId)
    )
    .groupBy(ProgramSchema.id, DepartmentSchema.name)
    .orderBy(asc(ProgramSchema.name));

  const totalPrograms = programs.length;
  const activePrograms = programs.filter((p) => p.isActive).length;
  const totalMappings = programs.reduce(
    (sum, p) => sum + Number(p.curriculumCount),
    0
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Programs</h1>
          <p className="text-muted-foreground">
            Manage program curriculum mappings
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Programs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-muted-foreground" />
              <span className="text-3xl font-bold">{totalPrograms}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Programs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <span className="text-3xl font-bold">{activePrograms}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Course Mappings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <span className="text-3xl font-bold">{totalMappings}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Programs Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Programs</CardTitle>
          <CardDescription>
            {totalPrograms} program{totalPrograms !== 1 ? "s" : ""} registered
          </CardDescription>
        </CardHeader>
        <CardContent>
          {programs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No programs found.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Program Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Courses Mapped</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {programs.map((program) => (
                  <TableRow key={program.id}>
                    <TableCell className="font-mono font-medium">
                      {program.code}
                    </TableCell>
                    <TableCell className="font-medium">
                      {program.name}
                    </TableCell>
                    <TableCell>{program.departmentName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {Number(program.curriculumCount)} courses
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={program.isActive ? "default" : "secondary"}
                      >
                        {program.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/admin/programs/${program.id}/curriculum`}>
                          Edit Curriculum
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
