"use client";

import { BookOpen, GraduationCap, Loader2, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { cn } from "lib/utils";
import { Badge } from "ui/badge";
import { Button } from "ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "ui/card";
import { Input } from "ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "ui/select";

interface TutorCourse {
  id: string;
  courseCode: string;
  title: string;
}

interface CitedSource {
  index: number;
  title: string;
  materialType: string;
  weekNumber: number | null;
}

interface TutorMessage {
  role: "user" | "assistant";
  content: string;
  citedSources?: CitedSource[];
}

export function CourseTutor() {
  const [courses, setCourses] = useState<TutorCourse[] | null>(null);
  const [coursesError, setCoursesError] = useState<string | null>(null);
  const [courseId, setCourseId] = useState<string>("");
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/student/tutor")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load your courses");
        return res.json();
      })
      .then((data: { courses: TutorCourse[] }) => {
        if (cancelled) return;
        setCourses(data.courses);
        // Preselect from ?course=<id> (deep-link from a course card), else
        // auto-select when the student has exactly one course.
        const requested = new URLSearchParams(window.location.search).get(
          "course",
        );
        const match = requested
          ? data.courses.find((c) => c.id === requested)
          : undefined;
        if (match) setCourseId(match.id);
        else if (data.courses.length === 1) setCourseId(data.courses[0].id);
      })
      .catch((error) => {
        if (cancelled) return;
        setCoursesError(
          error instanceof Error ? error.message : "Failed to load courses",
        );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  const selectCourse = (id: string) => {
    setCourseId(id);
    setMessages([]);
  };

  const send = async () => {
    const message = input.trim();
    if (!message || loading || !courseId) return;

    const history = messages.map(({ role, content }) => ({ role, content }));
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/student/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, message, history }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Tutor request failed");
      }
      const data: { reply: string; citedSources: CitedSource[] } =
        await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply,
          citedSources: data.citedSources,
        },
      ]);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong",
      );
      // Remove the optimistic user message so it can be retried cleanly
      setMessages((prev) => prev.slice(0, -1));
      setInput(message);
    } finally {
      setLoading(false);
    }
  };

  const selectedCourse = courses?.find((c) => c.id === courseId);

  if (coursesError) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          {coursesError}
        </CardContent>
      </Card>
    );
  }

  if (courses === null) {
    return (
      <Card>
        <CardContent className="py-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading your courses…
        </CardContent>
      </Card>
    );
  }

  if (courses.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          You are not enrolled in any courses yet — the tutor teaches from your
          enrolled courses&apos; materials.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="py-0 gap-0 overflow-hidden">
      <CardHeader className="border-b px-4 py-3 flex flex-row items-center gap-3 space-y-0">
        <GraduationCap className="size-5 text-muted-foreground shrink-0" />
        <Select value={courseId} onValueChange={selectCourse}>
          <SelectTrigger
            className="w-full sm:w-96"
            aria-label="Select a course to study"
          >
            <SelectValue placeholder="Pick a course to study…" />
          </SelectTrigger>
          <SelectContent>
            {courses.map((course) => (
              <SelectItem key={course.id} value={course.id}>
                {course.courseCode} — {course.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="p-0">
        <div
          ref={scrollRef}
          className="h-[55vh] min-h-72 overflow-y-auto px-4 py-4 flex flex-col gap-3"
        >
          {messages.length === 0 && (
            <div className="text-sm text-muted-foreground text-center my-auto space-y-1">
              {selectedCourse ? (
                <>
                  <p className="font-medium text-foreground">
                    Studying {selectedCourse.courseCode}
                  </p>
                  <p>
                    Ask anything about this course — answers come from your
                    actual course materials, with citations.
                  </p>
                </>
              ) : (
                <p>Pick a course above to start a tutoring session.</p>
              )}
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
                m.role === "user"
                  ? "self-end bg-primary text-primary-foreground"
                  : "self-start bg-muted",
              )}
            >
              {m.content}
              {m.citedSources && m.citedSources.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {m.citedSources.map((source) => (
                    <Badge
                      key={source.index}
                      variant="outline"
                      className="text-xs font-normal gap-1"
                    >
                      <BookOpen className="size-3" />S{source.index}:{" "}
                      {source.title}
                      {source.weekNumber != null &&
                        ` (wk ${source.weekNumber})`}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="self-start flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Reading the course materials…
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="border-t px-3 py-3 gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder={courseId ? "Ask your tutor…" : "Pick a course first…"}
          aria-label="Tutor question"
          disabled={loading || !courseId}
        />
        <Button
          size="icon"
          onClick={send}
          disabled={loading || !courseId || !input.trim()}
          aria-label="Send question"
        >
          <Send className="size-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
