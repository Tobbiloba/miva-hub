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
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import { getSession } from "@/lib/auth/server";

const DAY_ORDER = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const dayLabel = (d: string) => d.charAt(0).toUpperCase() + d.slice(1);

const dayColor = (d: string) => {
  const map: Record<string, "default" | "secondary" | "outline"> = {
    monday: "default",
    tuesday: "secondary",
    wednesday: "outline",
    thursday: "default",
    friday: "secondary",
    saturday: "outline",
  };
  return map[d] || "outline";
};

export default async function StudentSchedulePage() {
  const session = await getSession();
  if (!session?.user) return <div>Error: Not logged in</div>;

  const userId = session.user.id;
  const rows = await pgAcademicRepository.getStudentSchedule(userId);

  // Sort by day then time
  const sorted = [...rows].sort((a, b) => {
    const dayDiff =
      DAY_ORDER.indexOf(a.schedule.dayOfWeek) -
      DAY_ORDER.indexOf(b.schedule.dayOfWeek);
    if (dayDiff !== 0) return dayDiff;
    return a.schedule.startTime.localeCompare(b.schedule.startTime);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Calendar className="h-8 w-8 text-blue-600" />
          Class Schedule
        </h1>
        <p className="text-muted-foreground">
          Your weekly class schedule for this semester
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Weekly Schedule ({sorted.length} class
            {sorted.length !== 1 ? "es" : ""})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sorted.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                No class schedule found for this semester. Contact your admin if
                this seems incorrect.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Day</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Instructor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Badge variant={dayColor(row.schedule.dayOfWeek)}>
                        {dayLabel(row.schedule.dayOfWeek)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {row.schedule.startTime} – {row.schedule.endTime}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="font-mono font-medium">
                          {row.course.courseCode}
                        </span>
                        <p className="text-xs text-muted-foreground">
                          {row.course.title}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">
                      {row.schedule.classType}
                    </TableCell>
                    <TableCell>
                      {row.schedule.roomLocation ? (
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          {row.schedule.roomLocation}
                          {row.schedule.buildingName && (
                            <span className="text-muted-foreground">
                              ({row.schedule.buildingName})
                            </span>
                          )}
                        </div>
                      ) : (
                        "TBA"
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {row.facultyName || "TBA"}
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
