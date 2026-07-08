"use client";

import {
  BookOpen,
  Brain,
  CalendarCheck,
  ClipboardList,
  Layers,
  Loader2,
  MessageCircleQuestion,
  Mic,
  RefreshCw,
  Sparkles,
  Target,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PlanTask {
  type:
    | "flashcards"
    | "tutor_session"
    | "reading"
    | "practice_quiz"
    | "office_hours"
    | "assignment_prep";
  title: string;
  description: string;
  concepts: string[];
  estimatedMinutes: number;
}

interface Plan {
  weeklyGoal: string;
  rationale: string;
  focusConcepts: string[];
  days: { day: string; tasks: PlanTask[] }[];
  signalsSummary: string | null;
  generatedAt: string;
}

const TASK_META: Record<
  PlanTask["type"],
  { label: string; icon: typeof Brain; href: (courseId: string) => string }
> = {
  flashcards: {
    label: "Flashcards",
    icon: Layers,
    href: () => "/student/flashcards",
  },
  tutor_session: {
    label: "AI Tutor",
    icon: MessageCircleQuestion,
    href: (id) => `/student/tutor?courseId=${id}`,
  },
  reading: {
    label: "Reading",
    icon: BookOpen,
    href: () => "/student/materials",
  },
  practice_quiz: {
    label: "Practice quiz",
    icon: Brain,
    href: () => "/student/lecture-study",
  },
  office_hours: {
    label: "Office hours",
    icon: Mic,
    href: (id) => `/student/professor?courseId=${id}`,
  },
  assignment_prep: {
    label: "Assignment",
    icon: ClipboardList,
    href: () => "/student/assignments",
  },
};

function StudyPlanPageInner() {
  const searchParams = useSearchParams();
  const [courses, setCourses] = useState<
    { id: string; courseCode: string; title: string }[]
  >([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [courseId, setCourseId] = useState(searchParams.get("courseId") ?? "");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetch("/api/student/tutor")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setCourses(data.courses || []))
      .catch(() => toast.error("Failed to load your courses"))
      .finally(() => setCoursesLoading(false));
  }, []);

  useEffect(() => {
    if (!courseId) return;
    setPlanLoading(true);
    setPlan(null);
    fetch(`/api/student/plan/${courseId}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setPlan(data.plan))
      .catch(() => toast.error("Failed to load your study plan"))
      .finally(() => setPlanLoading(false));
  }, [courseId]);

  const generate = async () => {
    if (!courseId || generating) return;
    setGenerating(true);
    try {
      const res = await fetch(`/api/student/plan/${courseId}`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error);
      setPlan(data.plan);
      toast.success("Your study plan is ready");
    } catch (err) {
      toast.error(
        err instanceof Error && err.message
          ? err.message
          : "Failed to generate your plan",
      );
    } finally {
      setGenerating(false);
    }
  };

  const totalMinutes =
    plan?.days.reduce(
      (sum, d) => sum + d.tasks.reduce((s, t) => s + t.estimatedMinutes, 0),
      0,
    ) ?? 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarCheck className="h-6 w-6 text-primary" />
          My Study Plan
        </h1>
        <p className="text-muted-foreground">
          A weekly plan built from your actual performance — grades, concept
          mastery, flashcard backlog, and upcoming deadlines.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Label className="mb-2 block">Course</Label>
          {coursesLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading your courses…
            </div>
          ) : courses.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              You are not enrolled in any courses yet.
            </p>
          ) : (
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger>
                <SelectValue placeholder="Pick a course" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.courseCode} — {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {planLoading && (
        <Card>
          <CardContent className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your plan…
          </CardContent>
        </Card>
      )}

      {courseId && !planLoading && !plan && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <Sparkles className="h-8 w-8 text-primary" />
            <p className="text-sm text-muted-foreground max-w-sm">
              No plan yet for this course. Generate one and Askly will study
              your grades, weak concepts, and deadlines to build your week.
            </p>
            <Button
              onClick={generate}
              disabled={generating}
              aria-label="Generate study plan"
            >
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing
                  your performance…
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" /> Generate my plan
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {plan && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" /> This week&apos;s
                  goal
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generate}
                  disabled={generating}
                  aria-label="Regenerate study plan"
                >
                  {generating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Regenerate
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm font-medium">{plan.weeklyGoal}</p>
              <p className="text-sm text-muted-foreground">{plan.rationale}</p>
              {plan.focusConcepts.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {plan.focusConcepts.map((c) => (
                    <span
                      key={c}
                      className="text-xs rounded-full border px-2 py-0.5 text-muted-foreground"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                ~{totalMinutes} min total · generated{" "}
                {new Date(plan.generatedAt).toLocaleDateString()}
                {plan.signalsSummary
                  ? ` · based on: ${plan.signalsSummary}`
                  : ""}
              </p>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {plan.days.map((d) => (
              <Card key={d.day}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{d.day}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {d.tasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Rest day — recharge.
                    </p>
                  ) : (
                    d.tasks.map((t, i) => {
                      const meta = TASK_META[t.type];
                      const Icon = meta?.icon ?? Brain;
                      return (
                        <Link
                          key={i}
                          href={meta ? meta.href(courseId) : "#"}
                          className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                          aria-label={`${t.title} — open ${meta?.label ?? "task"}`}
                        >
                          <Icon className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                          <span className="min-w-0">
                            <span className="text-sm font-medium flex items-center gap-2 flex-wrap">
                              {t.title}
                              <span className="text-xs font-normal text-muted-foreground">
                                {meta?.label ?? t.type} · ~{t.estimatedMinutes}{" "}
                                min
                              </span>
                            </span>
                            <span className="block text-sm text-muted-foreground">
                              {t.description}
                            </span>
                            {t.concepts.length > 0 && (
                              <span className="mt-1 flex flex-wrap gap-1">
                                {t.concepts.map((c) => (
                                  <span
                                    key={c}
                                    className="text-[10px] rounded-full bg-primary/10 px-1.5 py-0.5"
                                  >
                                    {c}
                                  </span>
                                ))}
                              </span>
                            )}
                          </span>
                        </Link>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function StudyPlanPage() {
  return (
    <Suspense fallback={null}>
      <StudyPlanPageInner />
    </Suspense>
  );
}
