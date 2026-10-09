"use client";

import { CalendarDays } from "lucide-react";
import { ToolCard, joinMeta } from "./tool-card";

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
    <ToolCard
      icon={<CalendarDays />}
      eyebrow={joinMeta(
        "Timetable",
        props.semester,
        props.week_number && `Week ${props.week_number}`,
      )}
      title="Your classes"
      bodyClassName="px-0 pb-0"
    >
      <div className="divide-y divide-border border-t border-border">
        {props.days.map((day) => (
          <div key={day.day} className="flex gap-4 px-5 py-3">
            <p className="w-24 shrink-0 pt-0.5 text-sm font-semibold">
              {day.day}
            </p>
            {day.classes.length === 0 ? (
              <p className="pt-0.5 text-sm text-muted-foreground">No classes</p>
            ) : (
              <ul className="min-w-0 flex-1 space-y-2">
                {day.classes.map((c, i) => (
                  <li key={i} className="text-sm">
                    <p>
                      <span className="tabular-nums text-muted-foreground">
                        {c.time}
                      </span>
                      <span className="font-medium"> {c.course_code}</span>
                      <span className="text-muted-foreground">
                        {" "}
                        · {c.course_name}
                      </span>
                    </p>
                    <p className="text-[13px] text-muted-foreground">
                      {joinMeta(c.class_type, c.location, c.instructor)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </ToolCard>
  );
}
