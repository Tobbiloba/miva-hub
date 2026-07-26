"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircle,
  Camera,
  CheckCircle,
  Clock,
  Loader2,
  Save,
  Send,
  Sparkles,
  Upload,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface SubmitFormProps {
  assignment: any;
  isOverdue: boolean;
  studentId: string;
}

interface SnapCriterion {
  criterion: string;
  comment: string;
  pointsAwarded: number;
}

interface SnapResult {
  autoPosted: boolean;
  suggestion: {
    suggestedGrade: number;
    feedback: string;
    criterionBreakdown: SnapCriterion[];
    confidence: number;
  } | null;
  message?: string;
}

const SNAP_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const SNAP_MAX_SIZE = 15 * 1024 * 1024; // 15MB

export default function SubmitForm({ assignment, isOverdue }: SubmitFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionText, setSubmissionText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Snap to Solve state
  const [snapPhoto, setSnapPhoto] = useState<File | null>(null);
  const [snapPreview, setSnapPreview] = useState<string | null>(null);
  const [isSnapping, setIsSnapping] = useState(false);
  const [snapResult, setSnapResult] = useState<SnapResult | null>(null);

  useEffect(() => {
    return () => {
      if (snapPreview) URL.revokeObjectURL(snapPreview);
    };
  }, [snapPreview]);

  const submissionType = assignment.submissionType || "file_upload";
  const totalPoints = Number(assignment.totalPoints ?? 100);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        setError("File size must be less than 10MB");
        return;
      }

      // Validate file type
      const allowedTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
        "application/zip",
        "application/x-zip-compressed",
      ];

      if (!allowedTypes.includes(file.type)) {
        setError(
          "Invalid file type. Please upload PDF, DOC, DOCX, TXT, or ZIP files.",
        );
        return;
      }

      setSelectedFile(file);
      setError(null);
    }
  };

  const handleSnapPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!SNAP_PHOTO_TYPES.includes(file.type)) {
      setError("Please choose a JPG, PNG, or WEBP photo.");
      return;
    }
    if (file.size > SNAP_MAX_SIZE) {
      setError("Photo must be smaller than 15MB.");
      return;
    }

    if (snapPreview) URL.revokeObjectURL(snapPreview);
    setSnapPhoto(file);
    setSnapPreview(URL.createObjectURL(file));
    setError(null);
  };

  const handleSnapSubmit = async () => {
    if (!snapPhoto) {
      setError("Take or choose a photo of your work first.");
      return;
    }

    setIsSnapping(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("photo", snapPhoto);

      const response = await fetch(
        `/api/student/assignments/${assignment.id}/snap`,
        { method: "POST", body: formData },
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Snap submission failed");
      }

      setSnapResult({
        autoPosted: !!result.autoPosted,
        suggestion: result.suggestion ?? null,
        message: result.message,
      });
      toast.success("Photo submitted");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Snap submission failed";
      setError(message);
      toast.error(message);
    } finally {
      setIsSnapping(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Validate submission
      if (submissionType === "text_entry" || submissionType === "online_test") {
        if (!submissionText.trim()) {
          setError("Text submission is required");
          return;
        }
      }

      if (submissionType === "file_upload") {
        if (!selectedFile) {
          setError("File upload is required");
          return;
        }
      }

      // Prepare form data
      const formData = new FormData();
      if (submissionText.trim()) {
        formData.append("submissionText", submissionText);
      }
      if (selectedFile) {
        formData.append("submissionFile", selectedFile);
      }

      // Submit assignment
      const response = await fetch(
        `/api/student/assignments/${assignment.id}/submit`,
        {
          method: "POST",
          body: formData,
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Submission failed");
      }

      setSuccess(true);

      // Redirect after successful submission
      setTimeout(() => {
        router.push("/student/assignments");
      }, 2000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred during submission",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    // TODO: Implement draft saving functionality
    alert("Draft saving functionality coming soon!");
  };

  if (success) {
    return (
      <Card className="border-emerald-500/30 bg-emerald-500/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="h-5 w-5" />
            Assignment Submitted Successfully!
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-emerald-600 dark:text-emerald-400">
            Your assignment has been submitted successfully. You will be
            redirected to the assignments page.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (snapResult) {
    const { autoPosted, suggestion } = snapResult;
    const confidencePct = suggestion
      ? Math.round(suggestion.confidence * 100)
      : null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            {autoPosted ? (
              <>
                <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                Graded automatically
              </>
            ) : (
              <>
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                Sent to your professor for review
              </>
            )}
            {confidencePct != null && (
              <Badge variant="secondary">{confidencePct}% confidence</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {autoPosted && suggestion ? (
            <>
              <p className="text-3xl font-bold">
                {suggestion.suggestedGrade}
                <span className="text-lg font-normal text-muted-foreground">
                  /{totalPoints}
                </span>
              </p>
              <p className="text-sm text-muted-foreground">
                {suggestion.feedback}
              </p>
              {suggestion.criterionBreakdown.length > 0 && (
                <div className="space-y-2 rounded-lg border p-3">
                  {suggestion.criterionBreakdown.map((c, i) => (
                    <div
                      key={`criterion-${i}`}
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
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {snapResult.message ??
                "Your photo was submitted. The AI's suggested grade needs your professor's confirmation — you'll see your grade once it's reviewed."}
            </p>
          )}
          <Button
            variant="outline"
            onClick={() => router.push("/student/assignments")}
          >
            Back to assignments
          </Button>
        </CardContent>
      </Card>
    );
  }

  const errorBanner = error && (
    <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
      <div className="flex items-center gap-2 text-destructive">
        <AlertCircle className="h-4 w-4" />
        <span className="text-sm font-medium">{error}</span>
      </div>
    </div>
  );

  const classicForm = (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errorBanner}

      {(submissionType === "text_entry" ||
        submissionType === "online_test") && (
        <div>
          <Label htmlFor="submissionText">Your Response</Label>
          <Textarea
            id="submissionText"
            value={submissionText}
            onChange={(e) => setSubmissionText(e.target.value)}
            placeholder="Enter your assignment response here..."
            className="mt-1"
            rows={6}
            required
            disabled={isSubmitting}
          />
        </div>
      )}

      {submissionType === "file_upload" && (
        <div>
          <Label htmlFor="submissionFile">Upload File</Label>
          <Input
            id="submissionFile"
            type="file"
            onChange={handleFileChange}
            className="mt-1"
            accept=".pdf,.doc,.docx,.txt,.zip"
            required
            disabled={isSubmitting}
          />
          <p className="text-sm text-muted-foreground mt-1">
            Accepted file types: PDF, DOC, DOCX, TXT, ZIP (max 10MB)
          </p>
          {selectedFile && (
            <p className="text-sm text-emerald-600 mt-1">
              Selected: {selectedFile.name} (
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          {isSubmitting ? "Submitting..." : "Submit Assignment"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleSaveDraft}
          disabled={isSubmitting}
        >
          <Save className="mr-2 h-4 w-4" />
          Save Draft
        </Button>
      </div>

      {isOverdue && assignment.lateSubmissionPenalty && (
        <div className="text-sm text-amber-600 bg-amber-500/10 p-3 rounded-lg">
          <AlertCircle className="h-4 w-4 inline mr-1" />
          Late submission penalty: {assignment.lateSubmissionPenalty}% will be
          deducted from your grade.
        </div>
      )}
    </form>
  );

  const snapPanel = (
    <div className="space-y-4">
      {errorBanner}

      <p className="text-sm text-muted-foreground">
        Photograph your handwritten work and get instant AI grading against the
        rubric. Low-confidence grades go to your professor for review.
      </p>

      <div>
        <Label htmlFor="snapPhoto">Photo of your work</Label>
        <Input
          id="snapPhoto"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleSnapPhotoChange}
          className="mt-1"
          disabled={isSnapping}
        />
        <p className="text-sm text-muted-foreground mt-1">
          JPG, PNG, or WEBP — max 15MB
        </p>
      </div>

      {snapPreview && (
        <div className="rounded-lg border p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={snapPreview}
            alt="Preview of your work"
            className="mx-auto max-h-80 rounded-md object-contain"
          />
        </div>
      )}

      <Button
        type="button"
        className="w-full"
        onClick={handleSnapSubmit}
        disabled={isSnapping || !snapPhoto}
      >
        {isSnapping ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="mr-2 h-4 w-4" />
        )}
        {isSnapping ? "Grading your work..." : "Submit & Grade with AI"}
      </Button>

      {isSnapping && (
        <p className="text-center text-sm text-muted-foreground">
          The AI is reading your work — this usually takes 10–20 seconds.
        </p>
      )}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Submit Assignment
          {isOverdue && (
            <Badge variant="destructive" className="ml-2">
              Late Submission
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {submissionType === "file_upload" ? (
          <Tabs defaultValue="upload">
            <TabsList className="mb-4 grid w-full grid-cols-2">
              <TabsTrigger value="upload">
                <Upload className="mr-1.5 h-4 w-4" />
                Upload File
              </TabsTrigger>
              <TabsTrigger value="snap">
                <Camera className="mr-1.5 h-4 w-4" />
                Snap to Solve
              </TabsTrigger>
            </TabsList>
            <TabsContent value="upload">{classicForm}</TabsContent>
            <TabsContent value="snap">{snapPanel}</TabsContent>
          </Tabs>
        ) : (
          classicForm
        )}
      </CardContent>
    </Card>
  );
}
