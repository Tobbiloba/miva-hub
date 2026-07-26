"use client";

import {
  ArrowLeft,
  AudioLines,
  CheckCircle2,
  Loader2,
  Sparkles,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";

const WEEK_OPTIONS = Array.from({ length: 16 }, (_, i) => ({
  value: (i + 1).toString(),
  label: `Week ${i + 1}`,
}));

const MAX_FILE_MB = 14;

interface PipelineResult {
  materialId: string;
  studyKit: {
    summary: string;
    keyConcepts: string[];
    difficulty: string;
    noteSections: number;
    flashcards: number;
    quizQuestions: number;
    recapAudio: boolean;
  };
}

export default function LectureStudioPage() {
  const [courses, setCourses] = useState<
    { id: string; courseCode: string; title: string }[]
  >([]);
  const [courseId, setCourseId] = useState("");
  const [weekNumber, setWeekNumber] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<PipelineResult | null>(null);

  useEffect(() => {
    fetch("/api/faculty/courses")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setCourses(data.data || []))
      .catch(() => toast.error("Failed to load courses"));
  }, []);

  const canSubmit =
    courseId && weekNumber && title.trim() && file && !processing;

  const handleSubmit = async () => {
    if (!canSubmit || !file) return;
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      toast.error(
        `File is over ${MAX_FILE_MB}MB. Compress the recording to audio (e.g. 64kbps mp3) first.`,
      );
      return;
    }

    setProcessing(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("courseId", courseId);
      formData.append("weekNumber", weekNumber);
      formData.append("title", title.trim());
      formData.append("description", description);

      const res = await fetch("/api/faculty/lecture-studio", {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Processing failed");
      }
      setResult(data);
      toast.success("Study kit generated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Processing failed");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/faculty/materials">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Lecture Studio
          </h1>
          <p className="text-muted-foreground">
            Upload a lecture recording — Gemini turns it into notes, flashcards,
            a quiz and an audio recap
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lecture Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Course *</Label>
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
            </div>
            <div className="space-y-2">
              <Label>Week *</Label>
              <Select value={weekNumber} onValueChange={setWeekNumber}>
                <SelectTrigger>
                  <SelectValue placeholder="Select week" />
                </SelectTrigger>
                <SelectContent>
                  {WEEK_OPTIONS.map((w) => (
                    <SelectItem key={w.value} value={w.value}>
                      {w.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Lecture Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Recursion and Memoization"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="recording">Recording (audio or video) *</Label>
            <Input
              id="recording"
              type="file"
              accept="audio/*,video/mp4,video/quicktime,video/webm"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file && (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Upload className="h-4 w-4" />
                {file.name} ({(file.size / (1024 * 1024)).toFixed(1)} MB)
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Up to {MAX_FILE_MB}MB. For long lectures, compress to low-bitrate
              audio first — the study kit only needs the voice track.
            </p>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full"
          >
            {processing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Listening to the lecture… this can take a minute
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Study Kit
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card className="border-emerald-500/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
              Study Kit Ready
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">{result.studyKit.summary}</p>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-muted px-3 py-1">
                {result.studyKit.noteSections} note sections
              </span>
              <span className="rounded-full bg-muted px-3 py-1">
                {result.studyKit.flashcards} flashcards
              </span>
              <span className="rounded-full bg-muted px-3 py-1">
                {result.studyKit.quizQuestions} quiz questions
              </span>
              <span className="rounded-full bg-muted px-3 py-1">
                {result.studyKit.difficulty}
              </span>
              {result.studyKit.recapAudio && (
                <span className="rounded-full bg-muted px-3 py-1 flex items-center gap-1">
                  <AudioLines className="h-3 w-3" /> audio recap
                </span>
              )}
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/student/lecture-study/${result.materialId}`}>
                View the study kit as a student
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
