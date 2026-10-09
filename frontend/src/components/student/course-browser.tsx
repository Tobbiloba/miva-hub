"use client";

import { EmptyState } from "@/components/layouts/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "lib/utils";
import { BookOpen, Check, Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export interface BrowsableCourse {
  id: string;
  courseCode: string;
  title: string;
  credits: number | null;
  level: string | null;
  departmentName: string | null;
  semesterOffered: string | null;
  enrolled: boolean;
}

const VISIBLE_LIMIT = 60;

export function CourseBrowser({ courses }: { courses: BrowsableCourse[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(
    () => new Set(courses.filter((c) => c.enrolled).map((c) => c.id)),
  );

  const levels = useMemo(
    () =>
      [
        ...new Set(courses.map((c) => c.level).filter(Boolean)),
      ].sort() as string[],
    [courses],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return courses.filter((c) => {
      if (level && c.level !== level) return false;
      if (!q) return true;
      return (
        c.courseCode.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        (c.departmentName ?? "").toLowerCase().includes(q)
      );
    });
  }, [courses, query, level]);

  const visible = filtered.slice(0, VISIBLE_LIMIT);

  async function enroll(course: BrowsableCourse) {
    setPendingId(course.id);
    try {
      const res = await fetch("/api/student/enroll", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ courseId: course.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Enrollment failed");
        return;
      }
      setEnrolledIds((prev) => new Set(prev).add(course.id));
      toast.success(data.message ?? `Enrolled in ${course.courseCode}`);
      router.refresh();
    } catch {
      toast.error("Network error — please try again");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 basis-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by code, title or department"
            className="pl-9"
            aria-label="Search courses"
          />
        </div>
        <div
          role="radiogroup"
          aria-label="Level"
          className="flex rounded-lg bg-secondary p-0.5"
        >
          {[null, ...levels].map((l) => {
            const active = level === l;
            return (
              <button
                key={l ?? "all"}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setLevel(l)}
                className={cn(
                  "h-8 rounded-md px-3 text-[13px] transition-colors",
                  active
                    ? "bg-card font-medium text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.08)] dark:bg-input"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {l ?? "All"}
              </button>
            );
          })}
        </div>
      </div>

      <p className="px-1 text-[13px] text-muted-foreground">
        {filtered.length} course{filtered.length !== 1 ? "s" : ""}
        {filtered.length > VISIBLE_LIMIT
          ? ` · showing the first ${VISIBLE_LIMIT}, search to narrow down`
          : ""}
      </p>

      {visible.length === 0 ? (
        <EmptyState icon={<BookOpen />} title="No courses match">
          Try a different course code or clear the level filter.
        </EmptyState>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {visible.map((course) => {
            const isEnrolled = enrolledIds.has(course.id);
            const isPending = pendingId === course.id;
            return (
              <li
                key={course.id}
                className="flex items-center gap-4 px-4 py-3 sm:px-5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">
                    <span className="font-semibold">{course.courseCode}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      · {course.title}
                    </span>
                  </p>
                  <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
                    {[
                      course.departmentName,
                      course.level,
                      course.credits != null && `${course.credits} credits`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                {isEnrolled ? (
                  <span className="flex shrink-0 items-center gap-1 text-[13px] font-medium text-success">
                    <Check className="size-4" />
                    Enrolled
                  </span>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    disabled={isPending}
                    onClick={() => enroll(course)}
                    aria-label={`Enroll in ${course.courseCode}`}
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Enroll"
                    )}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
