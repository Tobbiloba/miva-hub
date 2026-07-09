import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth/server";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import { Bell } from "lucide-react";

const PRIORITY_COLORS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  urgent: "destructive",
  high: "destructive",
  medium: "default",
  low: "secondary",
};

export default async function StudentAnnouncementsPage() {
  const session = await getSession();
  if (!session?.user) return <div>Error: Not logged in</div>;

  const userId = session.user.id;

  // Fetch all announcements (high limit to get everything)
  const announcements =
    await pgAcademicRepository.getStudentRecentAnnouncements(userId, 100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Bell className="h-8 w-8 text-blue-600" />
          Announcements
        </h1>
        <p className="text-muted-foreground">
          Updates from your courses and university
        </p>
      </div>

      {announcements.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                No announcements for your enrolled courses.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {announcements.map(({ announcement, course }) => (
            <Card key={announcement.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg">
                      {announcement.title}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      {course && (
                        <Badge variant="outline" className="font-mono text-xs">
                          {course.courseCode}
                        </Badge>
                      )}
                      {!course && (
                        <Badge variant="outline" className="text-xs">
                          University
                        </Badge>
                      )}
                      <Badge
                        variant={
                          PRIORITY_COLORS[announcement.priority] || "secondary"
                        }
                      >
                        {announcement.priority}
                      </Badge>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(announcement.createdAt).toLocaleDateString(
                      undefined,
                      { year: "numeric", month: "short", day: "numeric" },
                    )}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {announcement.content}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
