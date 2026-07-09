"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  ExternalLink,
  Loader2,
  Pencil,
  RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface CriterionItem {
  criterion: string;
  comment: string;
  pointsAwarded: number;
}

interface QueueItem {
  decision: {
    id: string;
    actor: string;
    confidence: number | null;
    reasoning: string | null;
    metadata: Record<string, unknown> | null;
    createdAt: string;
  };
  submission: {
    id: string;
    submittedAt: string;
    isLateSubmission: boolean | null;
    fileName: string | null;
    mimeType: string | null;
    submissionText: string | null;
  };
  assignment: { id: string; title: string; totalPoints: string };
  course: { id: string; courseCode: string; title: string };
  student: { id: string; name: string };
  photoUrl: string | null;
}

function confidenceBadge(confidence: number | null) {
  const pct = confidence != null ? Math.round(confidence * 100) : null;
  if (pct == null) return <Badge variant="outline">No confidence</Badge>;
  if (pct >= 85)
    return (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
        {pct}% confident
      </Badge>
    );
  if (pct >= 60)
    return (
      <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
        {pct}% confident
      </Badge>
    );
  return (
    <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
      {pct}% confident
    </Badge>
  );
}

function QueueItemCard({
  item,
  onReviewed,
}: {
  item: QueueItem;
  onReviewed: (decisionId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [overriding, setOverriding] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const metadata = (item.decision.metadata ?? {}) as Record<string, unknown>;
  const suggestedGrade = Number(metadata.suggestedGrade ?? 0);
  const totalPoints = Number(item.assignment.totalPoints);
  const breakdown = Array.isArray(metadata.criterionBreakdown)
    ? (metadata.criterionBreakdown as CriterionItem[])
    : [];

  const [grade, setGrade] = useState(String(suggestedGrade));
  const [feedback, setFeedback] = useState(item.decision.reasoning ?? "");

  const applyGrade = async (finalGrade: number, finalFeedback: string) => {
    setSubmitting(true);
    try {
      const response = await fetch("/api/faculty/grade/ai/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId: item.submission.id,
          decisionId: item.decision.id,
          grade: finalGrade,
          feedback: finalFeedback || undefined,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        toast.error(result.error ?? "Failed to apply grade");
        return;
      }
      toast.success(
        result.reviewStatus === "overridden"
          ? "Grade overridden and applied"
          : "AI grade approved and applied",
      );
      onReviewed(item.decision.id);
    } catch {
      toast.error("Network error — grade was not applied");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOverride = () => {
    const parsed = Number(grade);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > totalPoints) {
      toast.error(`Grade must be between 0 and ${totalPoints}`);
      return;
    }
    applyGrade(parsed, feedback);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{item.student.name}</CardTitle>
            <CardDescription>
              {item.course.courseCode} — {item.assignment.title}
              {item.submission.isLateSubmission && (
                <Badge variant="destructive" className="ml-2">
                  Late
                </Badge>
              )}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {confidenceBadge(item.decision.confidence)}
            <Badge variant="secondary">
              Suggested: {suggestedGrade}/{totalPoints}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {item.decision.reasoning && (
          <p className="text-sm text-muted-foreground">
            {item.decision.reasoning}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {item.photoUrl && (
            <Button variant="outline" size="sm" asChild>
              <a href={item.photoUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1 h-3.5 w-3.5" />
                View photo{" "}
                {item.submission.fileName
                  ? `(${item.submission.fileName})`
                  : ""}
              </a>
            </Button>
          )}
          {breakdown.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? (
                <ChevronUp className="mr-1 h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="mr-1 h-3.5 w-3.5" />
              )}
              Criterion breakdown ({breakdown.length})
            </Button>
          )}
        </div>

        {expanded && breakdown.length > 0 && (
          <div className="space-y-2 rounded-lg border p-3">
            {breakdown.map((c, i) => (
              <div
                key={`${item.decision.id}-criterion-${i}`}
                className="flex items-start justify-between gap-3 text-sm"
              >
                <div>
                  <p className="font-medium">{c.criterion}</p>
                  <p className="text-muted-foreground">{c.comment}</p>
                </div>
                <Badge variant="outline" className="shrink-0">
                  {c.pointsAwarded} pts
                </Badge>
              </div>
            ))}
          </div>
        )}

        {overriding ? (
          <div className="space-y-3 rounded-lg border p-3">
            <div>
              <Label htmlFor={`grade-${item.decision.id}`}>
                Grade (max {totalPoints})
              </Label>
              <Input
                id={`grade-${item.decision.id}`}
                type="number"
                min={0}
                max={totalPoints}
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="mt-1 max-w-32"
                disabled={submitting}
              />
            </div>
            <div>
              <Label htmlFor={`feedback-${item.decision.id}`}>Feedback</Label>
              <Textarea
                id={`feedback-${item.decision.id}`}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={3}
                className="mt-1"
                disabled={submitting}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleOverride} disabled={submitting}>
                {submitting ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="mr-1 h-3.5 w-3.5" />
                )}
                Apply grade
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setOverriding(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() =>
                applyGrade(suggestedGrade, item.decision.reasoning ?? "")
              }
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="mr-1 h-3.5 w-3.5" />
              )}
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setOverriding(true)}
              disabled={submitting}
            >
              <Pencil className="mr-1 h-3.5 w-3.5" />
              Override
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ReviewQueuePage() {
  const [items, setItems] = useState<QueueItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/faculty/grade/ai/queue");
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "Failed to load the review queue");
        return;
      }
      setItems(result.items ?? []);
    } catch {
      setError("Network error — could not load the review queue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const handleReviewed = (decisionId: string) => {
    setItems((prev) =>
      prev ? prev.filter((i) => i.decision.id !== decisionId) : prev,
    );
  };

  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <ClipboardCheck className="h-6 w-6" />
            AI Review Queue
          </h1>
          <p className="text-sm text-muted-foreground">
            AI-suggested grades below the confidence threshold — approve or
            override before they post.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadQueue}
          disabled={loading}
        >
          <RefreshCw
            className={`mr-1 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {loading && (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-72" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-9 w-40" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && error && (
        <Card className="border-destructive/50">
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm">{error}</p>
            <Button variant="outline" size="sm" onClick={loadQueue}>
              Try again
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && !error && items && items.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <ClipboardCheck className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">No AI grades waiting for review</p>
            <p className="text-sm text-muted-foreground">
              High-confidence grades post automatically; lower-confidence
              suggestions will appear here.
            </p>
          </CardContent>
        </Card>
      )}

      {!loading && !error && items && items.length > 0 && (
        <div className="space-y-4">
          {items.map((item) => (
            <QueueItemCard
              key={item.decision.id}
              item={item}
              onReviewed={handleReviewed}
            />
          ))}
        </div>
      )}
    </div>
  );
}
