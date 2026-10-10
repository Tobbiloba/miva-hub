"use client";

import {
  Award,
  GraduationCap,
  Layers,
  Loader2,
  MessageSquare,
  Mic,
  MicOff,
  Sparkles,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useVivaVoice } from "@/lib/ai/speech/gemini/use-viva-voice";
import { cn } from "lib/utils";

const CRITERION_LABELS: Record<string, string> = {
  conceptual_understanding: "Conceptual Understanding",
  accuracy: "Accuracy",
  depth_of_reasoning: "Depth of Reasoning",
  communication: "Communication",
  responsiveness_to_probing: "Responsiveness to Probing",
};

type Allowance = {
  kind: "trial" | "monthly";
  limitSeconds: number;
  remainingSeconds: number;
  resetsAt: string | null;
};

function allowanceLine(a: Allowance): string {
  const left = Math.floor(a.remainingSeconds / 60);
  const total = Math.round(a.limitSeconds / 60);
  if (a.kind === "trial") {
    return `${left} of ${total} free-trial voice minutes left`;
  }
  const refill = a.resetsAt
    ? new Date(a.resetsAt).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
      })
    : null;
  return `${left} of ${total} voice minutes left this month${refill ? ` · refills ${refill}` : ""}`;
}

function formatClock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

const VERDICT_STYLES: Record<string, string> = {
  distinction: "bg-primary/10 text-primary border-primary/40",
  pass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/40",
  borderline:
    "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/40",
  fail: "bg-destructive/10 text-destructive border-destructive/30",
};

export default function VivaCoachPage() {
  const [courses, setCourses] = useState<
    { id: string; courseCode: string; title: string }[]
  >([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [courseId, setCourseId] = useState("");
  const [focusTopic, setFocusTopic] = useState("");
  const [mode, setMode] = useState<"tutor" | "viva">("tutor");

  const viva = useVivaVoice();
  const router = useRouter();
  const [allowance, setAllowance] = useState<Allowance | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Minutes left: on load, and again whenever a session finishes
  const sessionOpen =
    viva.status === "connecting" ||
    viva.status === "active" ||
    viva.status === "scoring";
  useEffect(() => {
    if (sessionOpen) return;
    fetch("/api/student/viva/usage")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setAllowance(data?.allowance ?? null))
      .catch(() => setAllowance(null));
  }, [sessionOpen]);

  // Tick the in-session countdown
  useEffect(() => {
    if (!viva.endsAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [viva.endsAt]);
  const secondsLeft = viva.endsAt ? (viva.endsAt - now) / 1000 : null;
  const outOfMinutes = !!allowance && allowance.remainingSeconds < 30;
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // The chat's start-voice-session tool links here with the session preset:
    // ?course=<courseId>&mode=tutor|viva&topic=...
    const preset = new URLSearchParams(window.location.search);
    const presetMode = preset.get("mode");
    if (presetMode === "tutor" || presetMode === "viva") setMode(presetMode);
    const presetTopic = preset.get("topic");
    if (presetTopic) setFocusTopic(presetTopic.slice(0, 200));
    const presetCourse = preset.get("course");

    fetch("/api/student/tutor")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        const list: { id: string }[] = data.courses || [];
        setCourses(data.courses || []);
        if (presetCourse && list.some((c) => c.id === presetCourse)) {
          setCourseId(presetCourse);
        }
      })
      .catch(() => toast.error("Failed to load your courses"))
      .finally(() => setCoursesLoading(false));
  }, []);

  /** Open the saved session in chat and ask for flashcards there */
  const makeFlashcards = () => {
    if (!viva.threadId) return;
    try {
      sessionStorage.setItem(
        `askly:pending-prompt:${viva.threadId}`,
        viva.mode === "viva"
          ? "Make flashcards from my weak spots in this mock viva: the points under 'Revise this' and anything I got wrong."
          : "Make flashcards from the parts of this voice session I found hard or got wrong.",
      );
    } catch {
      // Storage blocked: the thread still opens and they can ask by text
    }
    router.push(`/chat/${viva.threadId}`);
  };

  const followUps = viva.threadId ? (
    <div className="grid gap-2 sm:grid-cols-2">
      <Button onClick={makeFlashcards}>
        <Layers className="mr-2 h-4 w-4" />
        Make flashcards from my weak spots
      </Button>
      <Button variant="outline" asChild>
        <Link href={`/chat/${viva.threadId}`}>
          <MessageSquare className="mr-2 h-4 w-4" />
          Continue in chat
        </Link>
      </Button>
    </div>
  ) : null;
  const tutor = viva.mode === "tutor";

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [viva.turns]);

  const inSession = viva.status === "active" || viva.status === "connecting";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-primary" />
          Voice Coach
        </h1>
        <p className="text-muted-foreground">
          Talk it through out loud with a tutor that knows your course, or
          practise a viva with an examiner who probes and grades you.
        </p>
      </div>

      {viva.status === "idle" || viva.status === "error" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Start a voice session</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {viva.error && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive flex items-center gap-2">
                <XCircle className="h-4 w-4 shrink-0" />
                {viva.error}
              </div>
            )}
            <div
              role="radiogroup"
              aria-label="Session type"
              className="grid grid-cols-2 gap-2"
            >
              {(
                [
                  ["tutor", "Tutor", "Explain it, quiz me, help me get it"],
                  ["viva", "Viva practice", "An examiner asks and grades you"],
                ] as const
              ).map(([value, title, hint]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={mode === value}
                  onClick={() => setMode(value)}
                  className={cn(
                    "rounded-xl border px-4 py-3 text-left transition-colors",
                    mode === value
                      ? "border-foreground bg-accent"
                      : "border-border hover:bg-accent/60",
                  )}
                >
                  <span className="block text-sm font-medium">{title}</span>
                  <span className="block text-xs text-muted-foreground">
                    {hint}
                  </span>
                </button>
              ))}
            </div>
            <div className="space-y-2">
              <Label>Course *</Label>
              {coursesLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading courses…
                </div>
              ) : courses.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  You are not enrolled in any courses yet.
                </p>
              ) : (
                <Select value={courseId} onValueChange={setCourseId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a course" />
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
            </div>
            <div className="space-y-2">
              <Label htmlFor="focus">Focus topic (optional)</Label>
              <Input
                id="focus"
                value={focusTopic}
                onChange={(e) => setFocusTopic(e.target.value)}
                placeholder="e.g. Recursion and memoization"
                maxLength={200}
              />
            </div>
            <Button
              className="w-full"
              disabled={!courseId || outOfMinutes}
              onClick={() =>
                viva.start(courseId, focusTopic || undefined, mode)
              }
            >
              <Mic className="mr-2 h-4 w-4" />
              {mode === "tutor" ? "Start talking" : "Start viva"}
            </Button>
            {allowance && (
              <p
                className={cn(
                  "text-xs",
                  outOfMinutes ? "text-destructive" : "text-muted-foreground",
                )}
              >
                {outOfMinutes
                  ? allowance.kind === "trial"
                    ? "You've used the 10 voice minutes in your free trial. Subscribe to get 60 minutes a month."
                    : "You've used this month's voice minutes. They refill on the 1st."
                  : allowanceLine(allowance)}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {mode === "tutor"
                ? 'Uses your microphone. Your tutor speaks first. Ask anything, or say "quiz me".'
                : "Uses your microphone. The examiner speaks first. Answer out loud, and expect follow-up questions."}
            </p>
          </CardContent>
        </Card>
      ) : null}

      {inSession && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                {viva.status === "connecting" ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    Connecting to your {tutor ? "tutor" : "examiner"}…
                  </>
                ) : (
                  <>
                    <span className="relative flex h-3 w-3">
                      <span
                        className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                          viva.isExaminerSpeaking
                            ? "bg-primary animate-ping"
                            : "bg-emerald-500 animate-ping"
                        }`}
                      />
                      <span
                        className={`relative inline-flex h-3 w-3 rounded-full ${
                          viva.isExaminerSpeaking
                            ? "bg-primary"
                            : "bg-emerald-500"
                        }`}
                      />
                    </span>
                    {viva.isExaminerSpeaking
                      ? tutor
                        ? "Tutor speaking…"
                        : "Examiner speaking…"
                      : tutor
                        ? "Listening…"
                        : "Listening — speak your answer"}
                  </>
                )}
              </span>
              <span className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
                {viva.course?.courseCode}
                {secondsLeft !== null && viva.status === "active" && (
                  <span
                    className={cn(
                      "font-mono tabular-nums",
                      secondsLeft <= 60 && "text-destructive",
                    )}
                    aria-label="Time left in this session"
                  >
                    {formatClock(secondsLeft)} left
                  </span>
                )}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-h-72 overflow-y-auto space-y-3 pr-1">
              {viva.turns.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  The transcript will appear here as you talk.
                </p>
              ) : (
                viva.turns.map((turn, i) => (
                  <div
                    key={`${i}-${turn.text.slice(0, 16)}`}
                    className={`text-sm rounded-lg px-3 py-2 ${
                      turn.role === "examiner"
                        ? "bg-primary/10 border border-primary/20"
                        : "bg-muted ml-6"
                    }`}
                  >
                    <p className="text-xs font-medium text-muted-foreground mb-0.5">
                      {turn.role === "examiner"
                        ? tutor
                          ? "Tutor"
                          : "Examiner"
                        : "You"}
                    </p>
                    {turn.text}
                  </div>
                ))
              )}
              <div ref={transcriptEndRef} />
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => viva.end(false)}>
                <Award className="mr-2 h-4 w-4" />
                {tutor ? "End session" : "End viva & get my results"}
              </Button>
              <Button variant="outline" onClick={() => viva.end(true)}>
                <MicOff className="mr-2 h-4 w-4" />
                Abandon
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {viva.status === "scoring" && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            {tutor
              ? "Saving your session…"
              : "The examiner is writing up your results…"}
          </CardContent>
        </Card>
      )}

      {viva.status === "completed" && viva.mode === "tutor" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Session saved</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {viva.turns.filter((t) => t.role === "student").length} things you
              said, {viva.turns.filter((t) => t.role === "examiner").length}{" "}
              from your tutor. It's saved in your chats, so you can pick it up
              by text.
            </p>
            {viva.turns.at(-1)?.role === "examiner" && (
              <blockquote className="rounded-xl border bg-secondary/50 px-4 py-3 text-sm">
                {viva.turns.at(-1)?.text}
              </blockquote>
            )}
            {followUps}
            <Button variant="ghost" className="w-full" onClick={viva.reset}>
              Start another session
            </Button>
          </CardContent>
        </Card>
      )}

      {viva.status === "completed" && viva.rubric && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Viva Results
              </span>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-medium capitalize ${
                  VERDICT_STYLES[viva.rubric.verdict] ?? "bg-muted"
                }`}
              >
                {viva.rubric.verdict} · {viva.rubric.overallScore}/100
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">{viva.rubric.summary}</p>
            <div className="space-y-2">
              {viva.rubric.criteria.map((c) => (
                <div key={c.name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{CRITERION_LABELS[c.name] ?? c.name}</span>
                    <span className="font-mono text-xs">{c.score}/20</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(c.score / 20) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{c.comment}</p>
                </div>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-emerald-500/30 p-3">
                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1">
                  Strengths
                </p>
                <ul className="text-sm space-y-1 list-disc pl-4">
                  {viva.rubric.strengths.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-lg border border-amber-500/30 p-3">
                <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1">
                  Work on
                </p>
                <ul className="text-sm space-y-1 list-disc pl-4">
                  {viva.rubric.improvements.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
            </div>
            {followUps}
            <Button variant="ghost" className="w-full" onClick={viva.reset}>
              Take another viva
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
