import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FolderOpen, Plus, ExternalLink } from "lucide-react";
import Link from "next/link";
import { getSession } from "@/lib/auth/server";
import { getFacultyInfo } from "@/lib/auth/faculty";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import { pgDb } from "@/lib/db/pg/db.pg";
import { CourseMaterialSchema, CourseSchema, CourseInstructorSchema, FacultySchema } from "@/lib/db/pg/schema.pg";
import { eq, and, desc, sql } from "drizzle-orm";

export default async function FacultyMaterialsPage() {
  const session = await getSession();
  const facultyInfo = getFacultyInfo(session);

  if (!facultyInfo) {
    return <div>Error: Invalid faculty session</div>;
  }

  // Get materials uploaded by this faculty
  const materials = await pgDb
    .select({
      id: CourseMaterialSchema.id,
      title: CourseMaterialSchema.title,
      materialType: CourseMaterialSchema.materialType,
      courseCode: CourseSchema.courseCode,
      courseTitle: CourseSchema.title,
      fileName: CourseMaterialSchema.fileName,
      contentUrl: CourseMaterialSchema.contentUrl,
      fileSize: CourseMaterialSchema.fileSize,
      weekNumber: CourseMaterialSchema.weekNumber,
      createdAt: CourseMaterialSchema.createdAt,
    })
    .from(CourseMaterialSchema)
    .innerJoin(CourseSchema, eq(CourseMaterialSchema.courseId, CourseSchema.id))
    .where(eq(CourseMaterialSchema.uploadedById, facultyInfo.id))
    .orderBy(desc(CourseMaterialSchema.createdAt));

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isExternalUrl = (m: typeof materials[number]) => !m.fileName && m.contentUrl?.startsWith("http");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FolderOpen className="h-8 w-8 text-blue-600" />
            Course Materials
          </h1>
          <p className="text-muted-foreground">Materials you&apos;ve uploaded to your courses</p>
        </div>
        <Button asChild>
          <Link href="/faculty/materials/upload">
            <Plus className="h-4 w-4 mr-2" />
            Upload Material
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Materials ({materials.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {materials.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No materials uploaded yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Week</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Uploaded</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materials.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {m.title}
                        {isExternalUrl(m) && (
                          <a href={m.contentUrl!} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3 text-muted-foreground" />
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{m.courseCode}</Badge>
                    </TableCell>
                    <TableCell className="capitalize">{m.materialType}</TableCell>
                    <TableCell>{m.weekNumber ? `Week ${m.weekNumber}` : "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {isExternalUrl(m) ? "URL" : formatFileSize(m.fileSize)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(m.createdAt).toLocaleDateString()}
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
