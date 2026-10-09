"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  clearAssignmentProgress,
  useAssignmentProgress,
  useLoadAssignmentProgress,
} from "@/hooks/useAssignmentProgress";
import { authClient } from "@/lib/auth/client";
import { getStudentId } from "@/lib/auth/user-utils";
import { cn } from "lib/utils";
import {
  CheckCircle2,
  CloudOff,
  ExternalLink,
  FileText,
  Loader2,
  Send,
  Upload,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { ToolCard, joinMeta } from "./tool-card";

type AssignmentProps = {
  assignment_id?: string;
  course_code: string;
  course_name: string;
  title: string;
  description: string;
  due_date: string;
  total_points: number;
  submission_type?: "file" | "text" | "link" | "multiple";
  status?: "not_started" | "in_progress" | "submitted" | "graded";
  instructions?: string;
  rubric?: Array<{
    criteria: string;
    points: number;
    description: string;
  }>;
  resources?: Array<{
    type: string;
    title: string;
    url: string;
  }>;
};

export function Assignment(props: AssignmentProps) {
  const { data: session } = authClient.useSession();
  const studentId = getStudentId(session?.user);

  const [mode, setMode] = useState<"preview" | "interactive">("preview");
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [submissionText, setSubmissionText] = useState("");
  const [submissionLink, setSubmissionLink] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showResumePrompt, setShowResumePrompt] = useState(false);

  const { progress: savedProgress } = useLoadAssignmentProgress(
    props.assignment_id,
    studentId || undefined,
  );

  const fileMetadata = selectedFiles.map((f) => ({
    name: f.name,
    size: f.size,
    type: f.type,
  }));

  const { saveStatus, forceSave } = useAssignmentProgress({
    assignmentId: props.assignment_id,
    studentId: studentId || undefined,
    data: {
      submissionText,
      submissionFiles: fileMetadata,
      submissionLink,
    },
    debounceMs: 2000,
  });

  useEffect(() => {
    if (savedProgress && !showResumePrompt && mode === "preview") {
      const hasContent =
        (savedProgress.submissionText &&
          savedProgress.submissionText.trim().length > 0) ||
        (savedProgress.submissionFiles &&
          savedProgress.submissionFiles.length > 0) ||
        (savedProgress.submissionLink &&
          savedProgress.submissionLink.trim().length > 0);

      if (hasContent) {
        setShowResumePrompt(true);
      }
    }
  }, [savedProgress, showResumePrompt, mode]);

  const handleResumeProgress = () => {
    if (savedProgress) {
      if (savedProgress.submissionText)
        setSubmissionText(savedProgress.submissionText);
      if (savedProgress.submissionLink)
        setSubmissionLink(savedProgress.submissionLink);
      setShowResumePrompt(false);
      setMode("interactive");
    }
  };

  const handleStartFresh = async () => {
    await clearAssignmentProgress(props.assignment_id, studentId || undefined);
    setShowResumePrompt(false);
    setSubmissionText("");
    setSubmissionLink("");
    setSelectedFiles([]);
    setMode("interactive");
  };

  const getSaveStatusDisplay = () => {
    switch (saveStatus.status) {
      case "saving":
        return (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Saving draft...</span>
          </div>
        );
      case "saved":
        return (
          <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3 h-3" />
            <span>Draft saved</span>
          </div>
        );
      case "offline":
        return (
          <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
            <CloudOff className="w-3 h-3" />
            <span>Offline</span>
          </div>
        );
      case "error":
        return (
          <div className="flex items-center gap-2 text-xs text-destructive">
            <XCircle className="w-3 h-3" />
            <span>Error</span>
          </div>
        );
      default:
        return null;
    }
  };

  const statusLabel = props.status
    ? props.status.replace("_", " ").replace(/^./, (c) => c.toUpperCase())
    : undefined;
  const header = {
    icon: <FileText />,
    eyebrow: joinMeta("Assignment", props.course_code),
    title: props.title,
    meta: joinMeta(
      `Due ${props.due_date}`,
      `${props.total_points} points`,
      statusLabel,
    ),
  };

  if (mode === "preview") {
    const resumable = showResumePrompt && savedProgress;
    return (
      <ToolCard
        {...header}
        footer={
          resumable ? (
            <>
              <Button size="sm" onClick={handleResumeProgress}>
                Resume draft
              </Button>
              <Button size="sm" variant="ghost" onClick={handleStartFresh}>
                Start over
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => setMode("interactive")}>
              View details
            </Button>
          )
        }
      >
        <p className="line-clamp-3 text-sm text-muted-foreground">
          {props.description}
        </p>
      </ToolCard>
    );
  }

  const section = "border-t border-border pt-4 first:border-t-0 first:pt-0";

  return (
    <>
      <ToolCard
        {...header}
        action={
          <div className="flex items-center gap-3">
            {getSaveStatusDisplay()}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMode("preview")}
            >
              Close
            </Button>
          </div>
        }
        footer={
          props.status !== "submitted" && props.status !== "graded" ? (
            <Button
              size="sm"
              onClick={async () => {
                await forceSave();
                setShowSubmitDialog(true);
              }}
            >
              <Send />
              Submit assignment
            </Button>
          ) : undefined
        }
      >
        <div className="space-y-4 text-sm">
          <section className={section}>
            <h4 className="mb-1.5 font-semibold">Description</h4>
            <p className="leading-relaxed text-foreground/85">
              {props.description}
            </p>
          </section>

          {props.instructions && (
            <section className={section}>
              <h4 className="mb-1.5 font-semibold">Instructions</h4>
              <p className="whitespace-pre-wrap leading-relaxed text-foreground/85">
                {props.instructions}
              </p>
            </section>
          )}

          {props.rubric && props.rubric.length > 0 && (
            <section className={section}>
              <h4 className="mb-2 font-semibold">Grading rubric</h4>
              <ul className="divide-y divide-border rounded-lg border border-border">
                {props.rubric.map((item, i) => (
                  <li key={i} className="flex gap-3 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{item.criteria}</p>
                      <p className="text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {item.points} pts
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {props.resources && props.resources.length > 0 && (
            <section className={section}>
              <h4 className="mb-2 font-semibold">Resources</h4>
              <div className="space-y-1.5">
                {props.resources.map((resource, i) => (
                  <a
                    key={i}
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 transition-colors hover:bg-accent/60"
                  >
                    <span className="rounded-md bg-secondary px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                      {resource.type}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      {resource.title}
                    </span>
                    <ExternalLink className="size-4 text-muted-foreground" />
                  </a>
                ))}
              </div>
            </section>
          )}

          {props.status !== "submitted" && props.status !== "graded" && (
            <section className={cn(section, "space-y-4")}>
              <h4 className="font-semibold">Your submission</h4>

              {(props.submission_type === "file" ||
                props.submission_type === "multiple") && (
                <div className="space-y-2">
                  <Label htmlFor="file-upload">Files</Label>
                  <label
                    htmlFor="file-upload"
                    className="flex cursor-pointer flex-col items-center rounded-xl border border-dashed border-input px-6 py-7 text-center transition-colors hover:bg-accent/40"
                  >
                    <input
                      type="file"
                      multiple={props.submission_type === "multiple"}
                      onChange={(e) =>
                        setSelectedFiles(Array.from(e.target.files || []))
                      }
                      className="sr-only"
                      id="file-upload"
                    />
                    <Upload className="mb-2 size-6 text-muted-foreground" />
                    <span className="font-medium">Choose files</span>
                    <span className="text-xs text-muted-foreground">
                      PDF, DOC, DOCX or ZIP, up to 50 MB
                    </span>
                  </label>
                  {selectedFiles.length > 0 && (
                    <ul className="space-y-1">
                      {selectedFiles.map((file, i) => (
                        <li
                          key={i}
                          className="flex items-center gap-2 text-muted-foreground"
                        >
                          <FileText className="size-4" />
                          {file.name} ({(file.size / 1024).toFixed(0)} KB)
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {(props.submission_type === "text" ||
                props.submission_type === "multiple") && (
                <div className="space-y-2">
                  <Label htmlFor="submission-text">Text</Label>
                  <Textarea
                    id="submission-text"
                    value={submissionText}
                    onChange={(e) => setSubmissionText(e.target.value)}
                    placeholder="Type or paste your submission"
                    className="min-h-[180px]"
                  />
                </div>
              )}

              {(props.submission_type === "link" ||
                props.submission_type === "multiple") && (
                <div className="space-y-2">
                  <Label htmlFor="submission-link">Link</Label>
                  <Input
                    id="submission-link"
                    type="url"
                    value={submissionLink}
                    onChange={(e) => setSubmissionLink(e.target.value)}
                    placeholder="https://"
                  />
                </div>
              )}
            </section>
          )}
        </div>
      </ToolCard>

      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Submission</DialogTitle>
            <DialogDescription>
              Are you sure you want to submit this assignment? You won&apos;t be
              able to make changes after submission.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2 text-sm">
              {selectedFiles.length > 0 && (
                <div>
                  <span className="font-medium">Files: </span>
                  <span className="text-muted-foreground">
                    {selectedFiles.length} file(s)
                  </span>
                </div>
              )}
              {submissionText && (
                <div>
                  <span className="font-medium">Text: </span>
                  <span className="text-muted-foreground">
                    {submissionText.length} characters
                  </span>
                </div>
              )}
              {submissionLink && (
                <div>
                  <span className="font-medium">Link: </span>
                  <span className="text-muted-foreground break-all">
                    {submissionLink}
                  </span>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSubmitDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                await clearAssignmentProgress(
                  props.assignment_id,
                  studentId || undefined,
                );
                setShowSubmitDialog(false);
                alert("Assignment submitted successfully!");
              }}
            >
              Confirm Submission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
