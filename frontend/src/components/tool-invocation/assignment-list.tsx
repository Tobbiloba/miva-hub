"use client";

import { cn } from "lib/utils";
import { CalendarClock } from "lucide-react";
import { ToolCard, joinMeta } from "./tool-card";

type AssignmentListProps = {
  student_id?: string;
  total_count?: number;
  assignments: Array<{
    assignment_id?: string;
    title: string;
    course_code: string;
    course_name: string;
    due_date: string;
    due_time?: string;
    points_possible?: number;
    assignment_type?: string;
    urgency?: "urgent" | "soon" | "later";
    days_until_due?: number;
    description?: string;
    status?: string;
  }>;
};

const URGENCY = {
  urgent: {
    label: "Due soon",
    className: "bg-destructive/10 text-destructive",
  },
  soon: { label: "This week", className: "bg-warning/12 text-warning" },
  later: { label: "Later", className: "bg-secondary text-muted-foreground" },
} as const;

function dueIn(days?: number) {
  if (days === undefined) return undefined;
  if (days <= 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `In ${days} days`;
}

/** "12" + "Oct" for the little calendar tile; null when the date won't parse. */
function dateTile(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return {
    day: d.getDate(),
    month: d.toLocaleString("en", { month: "short" }),
  };
}

export function AssignmentList(props: AssignmentListProps) {
  const totalCount = props.total_count || props.assignments.length;

  if (props.assignments.length === 0) {
    return (
      <ToolCard
        icon={<CalendarClock />}
        eyebrow="Upcoming work"
        title="Nothing due"
        meta="You're all caught up."
      />
    );
  }

  return (
    <ToolCard
      icon={<CalendarClock />}
      eyebrow="Upcoming work"
      title={`${totalCount} ${totalCount === 1 ? "assignment" : "assignments"} due soon`}
      bodyClassName="px-0 pb-0"
    >
      <ul className="divide-y divide-border border-t border-border">
        {props.assignments.map((assignment, index) => {
          const urgency = assignment.urgency
            ? URGENCY[assignment.urgency]
            : undefined;
          return (
            <li key={index} className="flex items-start gap-4 px-5 py-3.5">
              {(() => {
                const tile = dateTile(assignment.due_date);
                return tile ? (
                  <span className="flex w-11 shrink-0 flex-col items-center overflow-hidden rounded-lg border border-border text-center">
                    <span className="w-full bg-secondary py-0.5 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                      {tile.month}
                    </span>
                    <span className="py-1 text-base leading-none font-semibold tabular-nums">
                      {tile.day}
                    </span>
                  </span>
                ) : null;
              })()}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-snug">
                  {assignment.title}
                </p>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  {joinMeta(
                    assignment.course_code,
                    `${assignment.due_date}${assignment.due_time ? ` at ${assignment.due_time}` : ""}`,
                    assignment.points_possible !== undefined &&
                      `${assignment.points_possible} points`,
                    assignment.status &&
                      assignment.status !== "not_started" &&
                      assignment.status.replace("_", " "),
                  )}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                {urgency && (
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      urgency.className,
                    )}
                  >
                    {urgency.label}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {dueIn(assignment.days_until_due)}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </ToolCard>
  );
}
