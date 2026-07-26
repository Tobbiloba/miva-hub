"use client";

import {
  ArrowLeft,
  AudioLines,
  BookOpen,
  CheckCircle2,
  Layers,
  Loader2,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StudyKit {
  summary: string | null;
  keyConcepts: string[];
  difficulty: string | null;
  estimatedReadTime: number | null;
  timestampedNotes: { timestamp: string; heading: string; notes: string }[];
  flashcards: { front: string; back: string }[];
  quiz: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }[];
  recapScript: string | null;
  recapAudio: boolean;
}

interface StudyResponse {
  material: {
    id: string;
    title: string;
    weekNumber: number | null;
    courseCode: string;
    courseTitle: string;
  };
  studyKit: StudyKit | null;
}

export default function LectureStudyPage() {
  const params = useParams<{ materialId: string }>();
  const materialId = params.materialId;

  const [data, setData] = useState<StudyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [answers, setAnswers] = useState<Record<number, number>>({});

  useEffect(() => {
    fetch(`/api/lecture-study/${materialId}`)
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Failed to load study kit");
        }
        return res.json();
      })
      .then(setData)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load"),
      )
      .finally(() => setLoading(false));
  }, [materialId]);

  const importFlashcards = async () => {
    setImporting(true);
    try {
      const res = await fetch(
        `/api/lecture-study/${materialId}/flashcards/import`,
        { method: "POST" },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Import failed");
      toast.success(
        body.alreadyImported
          ? "Already in your flashcards"
          : `${body.cardCount} cards added to your flashcards`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading study kit…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
        <XCircle className="h-10 w-10 mx-auto text-destructive" />
        <p className="text-muted-foreground">{error || "Not found"}</p>
        <Button variant="outline" asChild>
          <Link href="/student/courses">Back to courses</Link>
        </Button>
      </div>
    );
  }

  const { material, studyKit } = data;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/student/courses">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            {material.title}
          </h1>
          <p className="text-muted-foreground">
            {material.courseCode} — {material.courseTitle}
            {material.weekNumber ? ` · Week ${material.weekNumber}` : ""}
          </p>
        </div>
      </div>

      {!studyKit ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            The study kit for this lecture is still being generated. Check back
            shortly.
          </CardContent>
        </Card>
      ) : (
        <>
          {studyKit.recapAudio && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AudioLines className="h-5 w-5 text-primary" />
                  5-Minute Audio Recap
                </CardTitle>
              </CardHeader>
              <CardContent>
                <audio
                  controls
                  preload="none"
                  className="w-full"
                  src={`/api/lecture-study/${materialId}/recap-audio`}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  The whole lecture, recapped for low-bandwidth listening.
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm">{studyKit.summary}</p>
              <div className="flex flex-wrap gap-2">
                {studyKit.keyConcepts.map((concept) => (
                  <span
                    key={concept}
                    className="rounded-full bg-muted px-3 py-1 text-xs"
                  >
                    {concept}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Timestamped Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {studyKit.timestampedNotes.map((section) => (
                <div
                  key={`${section.timestamp}-${section.heading}`}
                  className="border-l-2 border-primary/40 pl-4"
                >
                  <p className="text-xs font-mono text-muted-foreground">
                    {section.timestamp}
                  </p>
                  <p className="font-medium">{section.heading}</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {section.notes}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-primary" />
                  Flashcards ({studyKit.flashcards.length})
                </span>
                <Button
                  size="sm"
                  onClick={importFlashcards}
                  disabled={importing}
                >
                  {importing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Add to my flashcards"
                  )}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {studyKit.flashcards.map((card) => (
                <div key={card.front} className="rounded-lg border p-3">
                  <p className="text-sm font-medium">{card.front}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {card.back}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Quick Quiz ({studyKit.quiz.length} questions)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {studyKit.quiz.map((q, qi) => {
                const picked = answers[qi];
                return (
                  <div key={q.question} className="space-y-2">
                    <p className="text-sm font-medium">
                      {qi + 1}. {q.question}
                    </p>
                    <div className="grid gap-2">
                      {q.options.map((option, oi) => {
                        const isPicked = picked === oi;
                        const isCorrect = q.correctIndex === oi;
                        const answered = picked !== undefined;
                        return (
                          <button
                            key={option}
                            type="button"
                            disabled={answered}
                            onClick={() =>
                              setAnswers((prev) => ({ ...prev, [qi]: oi }))
                            }
                            className={`text-left text-sm rounded-md border px-3 py-2 transition-colors ${
                              answered && isCorrect
                                ? "border-emerald-500 bg-emerald-500/10"
                                : answered && isPicked
                                  ? "border-destructive bg-destructive/10"
                                  : "hover:bg-muted"
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              {answered && isCorrect && (
                                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                              )}
                              {answered && isPicked && !isCorrect && (
                                <XCircle className="h-4 w-4 text-destructive shrink-0" />
                              )}
                              {option}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {picked !== undefined && (
                      <p className="text-xs text-muted-foreground">
                        {q.explanation}
                      </p>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
