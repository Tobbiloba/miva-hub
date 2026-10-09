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
          <div key={day.day} className="flex gap-4 px-5 py-3.5">
            <p className="w-12 shrink-0 pt-0.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase sm:w-24 sm:text-sm sm:tracking-normal sm:text-foreground sm:normal-case">
              <span className="sm:hidden">{day.day.slice(0, 3)}</span>
              <span className="hidden sm:inline">{day.day}</span>
            </p>
            {day.classes.length === 0 ? (
              <p className="pt-0.5 text-sm text-muted-foreground">No classes</p>
            ) : (
              <ul className="min-w-0 flex-1 space-y-2">
                {day.classes.map((c, i) => (
                  <li
                    key={i}
                    className="flex gap-3 rounded-lg border-l-2 border-brand bg-secondary/50 py-2 pr-3 pl-3"
                  >
                    <span className="w-24 shrink-0 text-[13px] tabular-nums text-muted-foreground">
                      {c.time}
                    </span>
                    <div className="min-w-0 text-sm">
                      <p className="truncate">
                        <span className="font-semibold">{c.course_code}</span>
                        <span className="text-muted-foreground">
                          {" "}
                          · {c.course_name}
                        </span>
                      </p>
                      <p className="truncate text-[13px] text-muted-foreground">
                        {joinMeta(c.class_type, c.location, c.instructor)}
                      </p>
                    </div>
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
