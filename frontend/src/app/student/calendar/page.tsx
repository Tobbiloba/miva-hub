import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth/server";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import { CalendarDays, Clock, MapPin } from "lucide-react";

const EVENT_TYPE_COLORS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  exam: "destructive",
  holiday: "secondary",
  academic: "default",
  registration: "default",
  ceremony: "outline",
  professional: "outline",
  maintenance: "secondary",
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  academic: "Academic",
  registration: "Registration",
  exam: "Exam",
  holiday: "Holiday",
  professional: "Professional",
  ceremony: "Ceremony",
  maintenance: "Maintenance",
};

function formatDateRange(
  start: string,
  end: string | null,
  _isAllDay: boolean,
) {
  const startDate = new Date(start + "T00:00:00");
  const opts: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  };

  if (!end || start === end) {
    return startDate.toLocaleDateString(undefined, opts);
  }
  const endDate = new Date(end + "T00:00:00");
  return `${startDate.toLocaleDateString(undefined, opts)} – ${endDate.toLocaleDateString(undefined, opts)}`;
}

export default async function StudentCalendarPage() {
  const session = await getSession();
  if (!session?.user) return <div>Error: Not logged in</div>;

  const userId = session.user.id;
  const events = await pgAcademicRepository.getStudentCalendarEvents(userId);

  // Split into upcoming and past
  const today = new Date().toISOString().split("T")[0];
  const upcoming = events.filter((e) => (e.endDate ?? e.startDate) >= today);
  const past = events.filter((e) => (e.endDate ?? e.startDate) < today);

  const renderEvent = (event: (typeof events)[number]) => (
    <div
      key={event.id}
      className="flex items-start gap-4 p-4 rounded-lg border"
    >
      <div className="shrink-0 pt-0.5">
        <CalendarDays className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold">{event.title}</h3>
          <Badge variant={EVENT_TYPE_COLORS[event.eventType] || "outline"}>
            {EVENT_TYPE_LABELS[event.eventType] || event.eventType}
          </Badge>
          {event.priority === "high" || event.priority === "critical" ? (
            <Badge variant="destructive">{event.priority}</Badge>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">
          {formatDateRange(event.startDate, event.endDate, event.isAllDay)}
        </p>
        {!event.isAllDay && event.startTime && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-3 w-3" />
            {event.startTime}
            {event.endTime && ` – ${event.endTime}`}
          </div>
        )}
        {event.location && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {event.location}
          </div>
        )}
        {event.description && (
          <p className="text-sm text-muted-foreground mt-1">
            {event.description}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <CalendarDays className="h-8 w-8 text-blue-600" />
          Academic Calendar
        </h1>
        <p className="text-muted-foreground">
          Important dates and events for your academic session
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming Events ({upcoming.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <div className="text-center py-12">
              <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                No upcoming events on the academic calendar.
              </p>
            </div>
          ) : (
            <div className="space-y-3">{upcoming.map(renderEvent)}</div>
          )}
        </CardContent>
      </Card>

      {past.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground">
              Past Events ({past.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 opacity-60">{past.map(renderEvent)}</div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
