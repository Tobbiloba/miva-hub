import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  FolderOpen,
  Download,
  ExternalLink,
  FileText,
  Video,
  BookOpen,
} from "lucide-react";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import { getSession } from "@/lib/auth/server";

const TYPE_LABELS: Record<string, string> = {
  syllabus: "Syllabus",
  lecture: "Lecture",
  assignment: "Assignment",
  resource: "Resource",
  reading: "Reading",
  exam: "Exam",
};

const TYPE_ICON: Record<string, typeof FileText> = {
  lecture: Video,
  reading: BookOpen,
};

function isExternalUrl(url: string | null) {
  if (!url) return false;
  return url.startsWith("http://") || url.startsWith("https://");
}

export default async function StudentMaterialsPage() {
  const session = await getSession();
  if (!session?.user) return <div>Error: Not logged in</div>;

  const userId = session.user.id;

  const [courses, materials] = await Promise.all([
    pgAcademicRepository.getStudentCourses(userId),
    pgAcademicRepository.getStudentMaterials(userId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FolderOpen className="h-8 w-8 text-blue-600" />
          Course Materials
        </h1>
        <p className="text-muted-foreground">
          Materials from your enrolled courses
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            All Materials ({materials.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {materials.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                No materials available. Check back after your instructor uploads
                content.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Week</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materials.map(({ material, course }) => {
                  const url = material.publicUrl || material.contentUrl;
                  const external = isExternalUrl(url);
                  const Icon = TYPE_ICON[material.materialType] || FileText;

                  return (
                    <TableRow key={material.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="font-medium">{material.title}</span>
                        </div>
                        {material.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            {material.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">
                          {course.courseCode}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {TYPE_LABELS[material.materialType] ||
                            material.materialType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {material.weekNumber
                          ? `Week ${material.weekNumber}`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(material.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {url ? (
                          external ? (
                            <Button variant="outline" size="sm" asChild>
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="h-4 w-4 mr-1" />
                                Open
                              </a>
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm" asChild>
                              <a
                                href={`/api/files/stream?url=${encodeURIComponent(url)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Download
                              </a>
                            </Button>
                          )
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            N/A
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
