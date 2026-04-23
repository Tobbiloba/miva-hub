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
import { Calendar, Clock, MapPin } from "lucide-react";
import { getSession } from "@/lib/auth/server";
import { getFacultyInfo } from "@/lib/auth/faculty";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import { pgDb } from "@/lib/db/pg/db.pg";
import {
  ClassScheduleSchema,
  CourseSchema,
  CourseInstructorSchema,
  FacultySchema,
} from "@/lib/db/pg/schema.pg";
import { eq, and, asc } from "drizzle-orm";

const DAY_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

const dayLabel = (d: string) => d.charAt(0).toUpperCase() + d.slice(1);

const dayColor = (d: string) => {
  const colors: Record<string, string> = {
    monday: "default",
    tuesday: "secondary",
    wednesday: "outline",
    thursday: "default",
    friday: "secondary",
    saturday: "outline",
  };
  return (colors[d] || "outline") as "default" | "secondary" | "outline";
};

export default async function FacultySchedulePage() {
  const session = await getSession();
  const facultyInfo = getFacultyInfo(session);

  if (!facultyInfo) {
    return <div>Error: Invalid faculty session</div>;
  }

  const facultyRecord = await pgAcademicRepository.getFacultyByUserId(facultyInfo.id);
  if (!facultyRecord) {
    return <div>Error: Faculty record not found</div>;
  }

  // Get faculty's course IDs
  const facultyCourses = await pgAcademicRepository.getFacultyCourses(facultyRecord.id);
  const courseIds = facultyCourses.map((fc) => fc.course.id);

  // Fetch schedules for faculty's courses
  let schedules: {
    courseCode: string;
    courseTitle: string;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    roomLocation: string;
    buildingName: string | null;
    classType: string;
  }[] = [];

  if (courseIds.length > 0) {
    const results = await Promise.all(
      courseIds.map((cid) =>
        pgDb
          .select({
            courseCode: CourseSchema.courseCode,
            courseTitle: CourseSchema.title,
            dayOfWeek: ClassScheduleSchema.dayOfWeek,
            startTime: ClassScheduleSchema.startTime,
            endTime: ClassScheduleSchema.endTime,
            roomLocation: ClassScheduleSchema.roomLocation,
            buildingName: ClassScheduleSchema.buildingName,
            classType: ClassScheduleSchema.classType,
          })
          .from(ClassScheduleSchema)
          .innerJoin(CourseSchema, eq(ClassScheduleSchema.courseId, CourseSchema.id))
          .where(eq(ClassScheduleSchema.courseId, cid))
      )
    );
    schedules = results.flat();
  }

  // Sort by day of week then start time
  schedules.sort((a, b) => {
    const dayDiff = DAY_ORDER.indexOf(a.dayOfWeek) - DAY_ORDER.indexOf(b.dayOfWeek);
    if (dayDiff !== 0) return dayDiff;
    return a.startTime.localeCompare(b.startTime);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Calendar className="h-8 w-8 text-blue-600" />
          Teaching Schedule
        </h1>
        <p className="text-muted-foreground">Your weekly class schedule</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Weekly Schedule ({schedules.length} class{schedules.length !== 1 ? "es" : ""})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {schedules.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No class schedules found. Contact your admin to set up your schedule.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Day</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((s, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Badge variant={dayColor(s.dayOfWeek)}>
                        {dayLabel(s.dayOfWeek)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {s.startTime} – {s.endTime}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="font-mono font-medium">{s.courseCode}</span>
                        <p className="text-xs text-muted-foreground">{s.courseTitle}</p>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">{s.classType}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        {s.roomLocation}
                        {s.buildingName && (
                          <span className="text-muted-foreground">({s.buildingName})</span>
                        )}
                      </div>
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
