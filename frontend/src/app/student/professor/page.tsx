"use client";

import {
  GraduationCap,
  Loader2,
  Mic,
  PhoneOff,
  Send,
  Sparkles,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
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
import { useOfficeHoursVoice } from "@/lib/ai/speech/gemini/use-office-hours-voice";

interface Professor {
  name: string;
  title: string;
  bio: string;
  traits: string[];
  greeting: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function ProfessorPageInner() {
  const searchParams = useSearchParams();
  const [courses, setCourses] = useState<
    { id: string; courseCode: string; title: string }[]
  >([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [courseId, setCourseId] = useState(searchParams.get("courseId") ?? "");
  const [professor, setProfessor] = useState<Professor | null>(null);
  const [professorLoading, setProfessorLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const voice = useOfficeHoursVoice();
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetch("/api/student/tutor")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setCourses(data.courses || []))
      .catch(() => toast.error("Failed to load your courses"))
      .finally(() => setCoursesLoading(false));
  }, []);

  useEffect(() => {
    if (!courseId) return;
    setProfessorLoading(true);
    setProfessor(null);
    setMessages([]);
    fetch(`/api/student/professor/${courseId}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        setProfessor(data.professor);
        setMessages([{ role: "assistant", content: data.professor.greeting }]);
      })
      .catch(() => toast.error("Failed to load your professor"))
      .finally(() => setProfessorLoading(false));
  }, [courseId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, voice.turns]);

  const send = async () => {
    const message = draft.trim();
    if (!message || sending || !courseId) return;
    setDraft("");
    setSending(true);
    const history = messages.slice(-20);
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    try {
      const res = await fetch(`/api/student/professor/${courseId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.answer },
      ]);
    } catch (err) {
      toast.error(
        err instanceof Error && err.message
          ? err.message
          : "Failed to get an answer",
      );
    } finally {
      setSending(false);
    }
  };

  const inVoiceSession =
    voice.status === "connecting" || voice.status === "active";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-primary" />
          Your AI Professor
        </h1>
        <p className="text-muted-foreground">
          Every course has its own professor — ask questions in chat, or hold a
          live voice office-hours session.
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
            <Select
              value={courseId}
              onValueChange={setCourseId}
              disabled={inVoiceSession}
            >
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

      {professorLoading && (
        <Card>
          <CardContent className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 animate-pulse" />
            Meeting your professor… (first visit generates their persona)
          </CardContent>
        </Card>
      )}

      {professor && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between gap-2">
                <span>
                  {professor.name}
                  <span className="block text-xs font-normal text-muted-foreground">
                    {professor.title}
                  </span>
                </span>
                {inVoiceSession ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={voice.end}
                    aria-label="End office hours call"
                  >
                    <PhoneOff className="mr-2 h-4 w-4" /> End call
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => voice.start(courseId)}
                    aria-label="Start voice office hours"
                  >
                    <Mic className="mr-2 h-4 w-4" /> Voice office hours
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{professor.bio}</p>
              <div className="flex flex-wrap gap-1">
                {professor.traits.map((trait) => (
                  <span
                    key={trait}
                    className="text-xs rounded-full border px-2 py-0.5 text-muted-foreground"
                  >
                    {trait}
                  </span>
                ))}
              </div>
              {voice.status === "connecting" && (
                <p className="text-sm flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Connecting to
                  office hours…
                </p>
              )}
              {voice.status === "active" && (
                <p className="text-sm flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      voice.isProfessorSpeaking
                        ? "bg-primary animate-pulse"
                        : "bg-green-500"
                    }`}
                  />
                  {voice.isProfessorSpeaking
                    ? `${professor.name} is speaking…`
                    : "Listening — go ahead"}
                </p>
              )}
              {voice.error && (
                <p className="text-sm text-destructive">{voice.error}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {inVoiceSession ? "Live transcript" : "Office hours chat"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-h-96 overflow-y-auto space-y-3 pr-1">
                {(inVoiceSession || voice.turns.length > 0
                  ? voice.turns.map((t) => ({
                      role:
                        t.role === "professor"
                          ? ("assistant" as const)
                          : ("user" as const),
                      content: t.text,
                    }))
                  : messages
                ).map((m, i) => (
                  <div
                    key={i}
                    className={`rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                      m.role === "assistant"
                        ? "bg-primary/10 mr-8"
                        : "bg-muted ml-8"
                    }`}
                  >
                    {m.content}
                  </div>
                ))}
                {sending && (
                  <div className="bg-primary/10 mr-8 rounded-lg px-3 py-2 text-sm flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {professor.name.split(" ")[0]} is thinking…
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {!inVoiceSession && (
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    send();
                  }}
                >
                  <Input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={`Ask ${professor.name.split(" ")[0]} anything about the course…`}
                    disabled={sending}
                    aria-label="Message your professor"
                  />
                  <Button
                    type="submit"
                    disabled={sending || !draft.trim()}
                    aria-label="Send message"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

export default function ProfessorPage() {
  return (
    <Suspense fallback={null}>
      <ProfessorPageInner />
    </Suspense>
  );
}
