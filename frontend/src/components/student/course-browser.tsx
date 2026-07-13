"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by course code, title, or department…"
            className="pl-9"
            aria-label="Search courses"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          <Button
            variant={level === null ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setLevel(null)}
          >
            All levels
          </Button>
          {levels.map((l) => (
            <Button
              key={l}
              variant={level === l ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setLevel(l)}
            >
              {l}
            </Button>
          ))}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {filtered.length} course{filtered.length !== 1 ? "s" : ""} found
        {filtered.length > VISIBLE_LIMIT
          ? ` — showing first ${VISIBLE_LIMIT}, refine your search to narrow down`
          : ""}
      </p>

      {visible.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="font-medium">No courses match your search</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Try a different course code or clear the level filter.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {visible.map((course) => {
            const isEnrolled = enrolledIds.has(course.id);
            const isPending = pendingId === course.id;
            return (
              <Card key={course.id}>
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="font-medium">{course.courseCode}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {course.title}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {course.departmentName && (
                        <Badge variant="outline" className="text-xs">
                          {course.departmentName}
                        </Badge>
                      )}
                      {course.level && (
                        <Badge variant="secondary" className="text-xs">
                          {course.level}
                        </Badge>
                      )}
                      {course.credits != null && (
                        <span className="text-xs text-muted-foreground">
                          {course.credits} cr
                        </span>
                      )}
                    </div>
                  </div>
                  {isEnrolled ? (
                    <Badge className="shrink-0" variant="secondary">
                      <Check className="mr-1 h-3 w-3" />
                      Enrolled
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
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
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
