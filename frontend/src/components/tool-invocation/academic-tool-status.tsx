"use client";

import { type ToolUIPart, getToolName } from "ai";
import {
  BookOpen,
  CalendarClock,
  History,
  Loader,
  Search,
  TriangleAlert,
  Users,
} from "lucide-react";
import { TextShimmer } from "ui/text-shimmer";

/**
 * The app's own academic tools, shown to the student as one plain line
 * ("Searched your course materials · 8 passages") instead of the developer
 * Request/Response panel. The model still gets the full output.
 */

type Line = {
  icon: typeof Search;
  running: string;
  done: (o: any, i: any) => string;
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

const LINES: Record<string, Line> = {
  "search-course-materials": {
    icon: Search,
    running: "Searching your course materials",
    done: (o) =>
      o?.passages?.length
        ? `Searched your course materials · ${plural(o.passages.length, "passage")}`
        : o?.coursesWithoutMaterials?.length
          ? `No materials yet for ${o.coursesWithoutMaterials.join(", ")}`
          : "Searched your course materials · nothing matched",
  },
  "get-course-materials": {
    icon: BookOpen,
    running: "Looking up course materials",
    done: () => "Looked up your course materials",
  },
  "get-my-courses": {
    icon: BookOpen,
    running: "Checking your courses",
    done: () => "Checked your courses",
  },
  "get-upcoming-assignments": {
    icon: CalendarClock,
    running: "Checking your deadlines",
    done: (o) =>
      typeof o?.total === "number"
        ? `Checked your deadlines · ${plural(o.total, "item")}`
        : "Checked your deadlines",
  },
  "manage-deadlines": {
    icon: CalendarClock,
    running: "Updating your deadlines",
    done: (o, i) =>
      o?.error
        ? `Couldn't update your deadlines: ${o.error}`
        : o?.saved
          ? `Saved to your deadlines: ${o.saved.title}`
          : o?.removed
            ? "Removed from your deadlines"
            : i?.action === "complete"
              ? "Marked done in your deadlines"
              : "Updated your deadlines",
  },
  "get-my-activity": {
    icon: History,
    running: "Looking at your recent activity",
    done: () => "Looked at your recent activity",
  },
  "get-academic-schedule": {
    icon: CalendarClock,
    running: "Checking your schedule",
    done: () => "Checked your schedule",
  },
  "find-faculty": {
    icon: Users,
    running: "Looking up staff",
    done: () => "Looked up staff",
  },
};

export function isAcademicStatusTool(toolName: string): boolean {
  return toolName in LINES;
}

export function AcademicToolStatus({ part }: { part: ToolUIPart }) {
  const line = LINES[getToolName(part)];
  if (!line) return null;
  const failed = part.state === "output-error";
  const done = part.state === "output-available";
  const Icon = failed ? TriangleAlert : done ? line.icon : Loader;
  const text = failed
    ? `${line.running} didn't work`
    : done
      ? line.done(part.output, part.input)
      : line.running;

  return (
    <div
      role="status"
      className="flex items-center gap-2 text-[13px] text-muted-foreground"
    >
      <span className="grid size-5 place-items-center">
        <Icon
          className={
            failed
              ? "size-3.5 text-destructive"
              : done
                ? "size-3.5"
                : "size-3.5 animate-spin"
          }
          aria-hidden
        />
      </span>
      {done || failed ? <span>{text}</span> : <TextShimmer>{text}</TextShimmer>}
    </div>
  );
}
