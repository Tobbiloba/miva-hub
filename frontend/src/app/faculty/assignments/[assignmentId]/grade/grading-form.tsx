"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Award, Save, Send, Loader2 } from "lucide-react";

interface GradingFormProps {
  submissionId: string;
  maxPoints: number;
  studentName: string;
  initialGrade: number | "";
  initialFeedback: string;
  nextSubmissionUrl?: string;
}

export default function GradingForm({
  submissionId,
  maxPoints,
  studentName,
  initialGrade,
  initialFeedback,
  nextSubmissionUrl,
}: GradingFormProps) {
  const router = useRouter();
  const [grade, setGrade] = useState<number | "">(initialGrade);
  const [feedback, setFeedback] = useState(initialFeedback);
  const [isLoading, setIsLoading] = useState(false);

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
      <CardContent>
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
