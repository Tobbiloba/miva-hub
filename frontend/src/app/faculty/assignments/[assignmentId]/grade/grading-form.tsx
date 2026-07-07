"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Award, Save, Send, Loader2, Sparkles, CheckCheck } from "lucide-react";

interface CriterionResult {
  criterion: string;
  comment: string;
  pointsAwarded: number;
}

interface AISuggestion {
  suggestedGrade: number;
  feedback: string;
  criterionBreakdown: CriterionResult[];
  confidence: number;
}

interface GradingFormProps {
  submissionId: string;
  maxPoints: number;
  studentName: string;
  initialGrade: number | "";
  initialFeedback: string;
  nextSubmissionUrl?: string;
  canAiGrade?: boolean;
}

export default function GradingForm({
  submissionId,
  maxPoints,
  studentName,
  initialGrade,
  initialFeedback,
  nextSubmissionUrl,
  canAiGrade = false,
}: GradingFormProps) {
  const router = useRouter();
  const [grade, setGrade] = useState<number | "">(initialGrade);
  const [feedback, setFeedback] = useState(initialFeedback);
  const [isLoading, setIsLoading] = useState(false);
  const [isAiGrading, setIsAiGrading] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [suggestion, setSuggestion] = useState<AISuggestion | null>(null);
  const [decisionId, setDecisionId] = useState<string | null>(null);

  const busy = isLoading || isAiGrading || isApproving;

  async function handleAiGrade() {
    setIsAiGrading(true);
    try {
      const response = await fetch("/api/faculty/grade/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error ?? "AI grading failed");
        return;
      }

      setSuggestion(result.suggestion);
      setDecisionId(result.decisionId);
      // Pre-fill the editable fields — faculty may adjust before approving
      setGrade(result.suggestion.suggestedGrade);
      setFeedback(result.suggestion.feedback);
      toast.success("AI suggestion ready — review and approve to apply");
    } catch {
      toast.error("Network error — AI grading could not be completed");
    } finally {
      setIsAiGrading(false);
    }
  }

  async function handleApproveAiGrade() {
    if (!decisionId) return;
    if (grade === "") {
      toast.error("Please enter a grade before approving");
      return;
    }

    setIsApproving(true);
    try {
      const response = await fetch("/api/faculty/grade/ai/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId,
          decisionId,
          grade: Number(grade),
          feedback,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error ?? "Failed to apply AI grade");
        return;
      }

      toast.success(result.message ?? "Grade applied");
      setSuggestion(null);
      setDecisionId(null);
      router.refresh();
    } catch {
      toast.error("Network error — grade could not be applied");
    } finally {
      setIsApproving(false);
    }
  }

  async function saveGrade(): Promise<boolean> {
    if (grade === "") {
      toast.error("Please enter a grade before saving");
      return false;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/faculty/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId, grade: Number(grade), feedback }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error ?? "Failed to save grade");
        return false;
      }

      toast.success(result.message ?? "Grade saved successfully");
      router.refresh();
      return true;
    } catch {
      toast.error("Network error — grade could not be saved");
      return false;
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await saveGrade();
  }

  async function handleSaveAndNext() {
    const saved = await saveGrade();
    if (saved && nextSubmissionUrl) {
      router.push(nextSubmissionUrl);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" />
          Grade Submission
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {canAiGrade && (
          <div className="space-y-3">
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              disabled={busy}
              onClick={handleAiGrade}
            >
              {isAiGrading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              {isAiGrading ? "Analyzing submission…" : "AI Grade"}
            </Button>

            {suggestion && (
              <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">AI Suggestion</span>
                  </div>
                  <Badge variant="outline">
                    {Math.round(suggestion.confidence * 100)}% confidence
                  </Badge>
                </div>

                <div className="text-sm">
                  Suggested grade:{" "}
                  <span className="font-semibold">
                    {suggestion.suggestedGrade}/{maxPoints}
                  </span>
                </div>

                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {suggestion.feedback}
                </p>

                {suggestion.criterionBreakdown.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      {suggestion.criterionBreakdown.map((item, index) => (
                        <div key={index} className="text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">
                              {item.criterion}
                            </span>
                            <Badge variant="secondary">
                              {item.pointsAwarded} pts
                            </Badge>
                          </div>
                          <p className="text-muted-foreground">
                            {item.comment}
                          </p>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <Button
                  type="button"
                  className="w-full"
                  disabled={busy}
                  onClick={handleApproveAiGrade}
                >
                  {isApproving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCheck className="mr-2 h-4 w-4" />
                  )}
                  {isApproving ? "Applying…" : "Approve & Apply"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Adjust the grade or feedback below before approving — the AI
                  suggestion is never applied without your review.
                </p>
              </div>
            )}

            <Separator />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="grade">Grade (out of {maxPoints})</Label>
            <Input
              id="grade"
              type="number"
              min="0"
              max={maxPoints}
              step="0.1"
              value={grade}
              onChange={(e) =>
                setGrade(e.target.value === "" ? "" : Number(e.target.value))
              }
              placeholder={`0 - ${maxPoints}`}
              className="mt-1"
              disabled={isLoading}
            />
            <p className="text-sm text-muted-foreground mt-1">
              Enter a grade between 0 and {maxPoints}
            </p>
          </div>

          <div>
            <Label htmlFor="feedback">Feedback</Label>
            <Textarea
              id="feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder={`Provide feedback for ${studentName}...`}
              className="mt-1"
              rows={4}
              disabled={isLoading}
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {isLoading ? "Saving…" : "Save Grade"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isLoading}
              onClick={handleSaveAndNext}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Save & Next
            </Button>
          </div>

          <div className="text-xs text-muted-foreground">
            Grade will be saved and student will be notified
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
