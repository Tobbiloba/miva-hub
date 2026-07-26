"use client";

import {
  Award,
  GraduationCap,
  Loader2,
  Mic,
  MicOff,
  Sparkles,
  XCircle,
} from "lucide-react";
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

const CRITERION_LABELS: Record<string, string> = {
  conceptual_understanding: "Conceptual Understanding",
  accuracy: "Accuracy",
  depth_of_reasoning: "Depth of Reasoning",
  communication: "Communication",
  responsiveness_to_probing: "Responsiveness to Probing",
};

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

  const viva = useVivaVoice();
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetch("/api/student/tutor")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setCourses(data.courses || []))
      .catch(() => toast.error("Failed to load your courses"))
      .finally(() => setCoursesLoading(false));
  }, []);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [viva.turns]);

  const inSession = viva.status === "active" || viva.status === "connecting";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-primary" />
          Viva Coach
        </h1>
        <p className="text-muted-foreground">
          A live oral exam on your actual course material — the AI examiner
          asks, listens, probes and grades you.
        </p>
      </div>

      {viva.status === "idle" || viva.status === "error" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Start a mock viva</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {viva.error && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive flex items-center gap-2">
                <XCircle className="h-4 w-4 shrink-0" />
                {viva.error}
              </div>
            )}
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
              disabled={!courseId}
              onClick={() => viva.start(courseId, focusTopic || undefined)}
            >
              <Mic className="mr-2 h-4 w-4" />
              Start viva
            </Button>
            <p className="text-xs text-muted-foreground">
              Uses your microphone. The examiner speaks first — answer out loud,
              and expect follow-up questions.
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
                    Connecting to your examiner…
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
                      ? "Examiner speaking…"
                      : "Listening — speak your answer"}
                  </>
                )}
              </span>
              {viva.course && (
                <span className="text-xs font-normal text-muted-foreground">
                  {viva.course.courseCode}
                </span>
              )}
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
                      {turn.role === "examiner" ? "Examiner" : "You"}
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
                End viva &amp; get my results
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
            The examiner is writing up your results…
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
            <Button variant="outline" className="w-full" onClick={viva.reset}>
              Take another viva
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
