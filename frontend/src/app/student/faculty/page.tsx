import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth/server";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import { Briefcase, Clock, Mail, MapPin, Users } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  primary: "Lead Instructor",
  assistant: "Teaching Assistant",
  lab_instructor: "Lab Instructor",
  grader: "Grader",
};

export default async function StudentFacultyPage() {
  const session = await getSession();
  if (!session?.user) return <div>Error: Not logged in</div>;

  const userId = session.user.id;
  const rows = await pgAcademicRepository.getStudentCourseFaculty(userId);

  // Group by course
  const byCourse = new Map<
    string,
    {
      courseCode: string;
      courseTitle: string;
      faculty: typeof rows;
    }
  >();

  for (const row of rows) {
    const key = row.course.id;
    if (!byCourse.has(key)) {
      byCourse.set(key, {
        courseCode: row.course.courseCode,
        courseTitle: row.course.title,
        faculty: [],
      });
    }
    byCourse.get(key)!.faculty.push(row);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Users className="h-8 w-8 text-blue-600" />
          Faculty Contacts
        </h1>
        <p className="text-muted-foreground">
          Instructors for your enrolled courses
        </p>
      </div>

      {byCourse.size === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                No faculty information available for your courses.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        Array.from(byCourse.values()).map((group) => (
          <Card key={group.courseCode}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="font-mono">{group.courseCode}</span>
                <span className="text-muted-foreground font-normal">
                  — {group.courseTitle}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {group.faculty.map((row) => {
                  const officeHours = row.faculty.officeHours;
                  let officeHoursStr = "By appointment";
                  if (Array.isArray(officeHours) && officeHours.length > 0) {
                    officeHoursStr = officeHours.join(", ");
                  } else if (typeof officeHours === "string" && officeHours) {
                    officeHoursStr = officeHours;
                  }

                  return (
                    <div
                      key={row.courseInstructor.id}
                      className="rounded-lg border p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">{row.user.name}</h3>
                        <Badge variant="secondary">
                          {ROLE_LABELS[row.courseInstructor.role] ||
                            row.courseInstructor.role}
                        </Badge>
                      </div>

                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-3 w-3" />
                          <span className="capitalize">
                            {row.faculty.position.replace(/_/g, " ")}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3" />
                          <a
                            href={`mailto:${row.user.email}`}
                            className="text-blue-600 hover:underline"
                          >
                            {row.user.email}
                          </a>
                        </div>
                        {row.faculty.officeLocation && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3 w-3" />
                            {row.faculty.officeLocation}
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          {officeHoursStr}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
