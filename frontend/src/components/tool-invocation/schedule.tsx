"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Clock, MapPin, User } from "lucide-react";

type ScheduleProps = {
  student_id?: string;
  semester?: string;
  week_number?: number;
  schedule_type?: "weekly" | "daily";
  days: Array<{
    day: string;
    classes: Array<{
      time: string;
      course_code: string;
      course_name: string;
      location?: string;
      instructor?: string;
      class_type?: string;
    }>;
  }>;
};

export function Schedule(props: ScheduleProps) {
  return (
    <div className="space-y-4">
      <Card className="bg-card">
        <CardHeader>
          <CardTitle>Academic Schedule</CardTitle>
          <CardDescription>
            {props.semester && <span>{props.semester}</span>}
            {props.week_number && (
              <>
                {props.semester && " • "}
                <span>Week {props.week_number}</span>
              </>
            )}
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {props.days.map((day, dayIndex) => (
          <Card key={dayIndex} className="bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">{day.day}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {day.classes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No classes
                </p>
              ) : (
                day.classes.map((classItem, classIndex) => (
                  <div
                    key={classIndex}
                    className="p-3 rounded-lg bg-secondary/40 hover:bg-secondary/60 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="font-medium text-xs">{classItem.course_code}</span>
                      {classItem.class_type && (
                        <span className="px-2 py-0.5 rounded-full bg-card text-xs border">
                          {classItem.class_type}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                      {classItem.course_name}
                    </p>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{classItem.time}</span>
                      </div>
                      {classItem.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span>{classItem.location}</span>
                        </div>
                      )}
                      {classItem.instructor && (
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span>{classItem.instructor}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
