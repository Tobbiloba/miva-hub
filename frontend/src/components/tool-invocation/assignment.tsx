"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, Calendar, ExternalLink, Upload, Send, Loader2, CloudOff, CheckCircle2, XCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAssignmentProgress, useLoadAssignmentProgress, clearAssignmentProgress } from "@/hooks/useAssignmentProgress";
import { authClient } from "@/lib/auth/client";
import { getStudentId } from "@/lib/auth/user-utils";

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
  
  const { progress: savedProgress } = useLoadAssignmentProgress(props.assignment_id, studentId || undefined);
  
  const fileMetadata = selectedFiles.map(f => ({
    name: f.name,
    size: f.size,
    type: f.type
  }));
  
  const { saveStatus, forceSave } = useAssignmentProgress({
    assignmentId: props.assignment_id,
    studentId: studentId || undefined,
    data: {
      submissionText,
      submissionFiles: fileMetadata,
      submissionLink
    },
    debounceMs: 2000
  });
  
  useEffect(() => {
    if (savedProgress && !showResumePrompt && mode === "preview") {
      const hasContent = 
        (savedProgress.submissionText && savedProgress.submissionText.trim().length > 0) ||
        (savedProgress.submissionFiles && savedProgress.submissionFiles.length > 0) ||
        (savedProgress.submissionLink && savedProgress.submissionLink.trim().length > 0);
      
      if (hasContent) {
        setShowResumePrompt(true);
      }
    }
  }, [savedProgress, showResumePrompt, mode]);
  
  const handleResumeProgress = () => {
    if (savedProgress) {
      if (savedProgress.submissionText) setSubmissionText(savedProgress.submissionText);
      if (savedProgress.submissionLink) setSubmissionLink(savedProgress.submissionLink);
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

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "not_started":
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
      case "in_progress":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "submitted":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "graded":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  const getSaveStatusDisplay = () => {
    switch (saveStatus.status) {
      case 'saving':
        return (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Saving draft...</span>
          </div>
        );
      case 'saved':
        return (
          <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
            <CheckCircle2 className="w-3 h-3" />
            <span>Draft saved</span>
          </div>
        );
      case 'offline':
        return (
          <div className="flex items-center gap-2 text-xs text-yellow-600 dark:text-yellow-400">
            <CloudOff className="w-3 h-3" />
            <span>Offline</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
            <XCircle className="w-3 h-3" />
            <span>Error</span>
          </div>
        );
      default:
        return null;
    }
  };

  if (mode === "preview") {
    return (
      <div className="space-y-4">
        {showResumePrompt && savedProgress && (
          <Alert className="bg-blue-500/10 border-blue-500/20">
            <AlertDescription className="flex items-center justify-between">
              <span className="text-sm">
                Resume your draft submission?
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleStartFresh}>
                  Start Fresh
                </Button>
                <Button size="sm" onClick={handleResumeProgress}>
                  Resume
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}
        
        <Card className="bg-card">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-secondary/40">
              <FileText className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-lg">{props.title}</h3>
                {props.status && (
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(props.status)}`}>
                    {props.status.replace("_", " ").toUpperCase()}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                {props.course_code && <span className="font-medium">{props.course_code}</span>}
                {props.course_name && props.course_code && " • "}
                {props.course_name}
              </p>
              <p className="text-sm mb-4">{props.description}</p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Due: {props.due_date}
                </span>
                <span>•</span>
                <span>{props.total_points} points</span>
              </div>
              <Button
                onClick={() => setMode("interactive")}
              >
                View Details
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="bg-card">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-semibold text-xl mb-2">{props.title}</h3>
              <p className="text-sm text-muted-foreground">
                {props.course_code} • {props.course_name}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {getSaveStatusDisplay()}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMode("preview")}
              >
                Close
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              Due: {props.due_date}
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="font-medium">{props.total_points} points</span>
            {props.status && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(props.status)}`}>
                  {props.status.replace("_", " ").toUpperCase()}
                </span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-secondary/40">
        <CardContent className="p-0">
          <Accordion type="multiple" defaultValue={["description"]} className="w-full">
            <AccordionItem value="description" className="border-b-0">
              <AccordionTrigger className="px-4">
                <h4 className="font-semibold text-sm">Description</h4>
              </AccordionTrigger>
              <AccordionContent className="px-4">
                <p className="text-sm">{props.description}</p>
              </AccordionContent>
            </AccordionItem>

            {props.instructions && (
              <AccordionItem value="instructions" className="border-b-0">
                <AccordionTrigger className="px-4">
                  <h4 className="font-semibold text-sm">Instructions</h4>
                </AccordionTrigger>
                <AccordionContent className="px-4">
                  <p className="text-sm whitespace-pre-wrap">{props.instructions}</p>
                </AccordionContent>
              </AccordionItem>
            )}

            {props.rubric && props.rubric.length > 0 && (
              <AccordionItem value="rubric" className="border-b-0">
                <AccordionTrigger className="px-4">
                  <h4 className="font-semibold text-sm">Grading Rubric</h4>
                </AccordionTrigger>
                <AccordionContent className="px-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Criteria</TableHead>
                        <TableHead>Points</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {props.rubric.map((item, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{item.criteria}</TableCell>
                          <TableCell>{item.points}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {item.description}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </AccordionContent>
              </AccordionItem>
            )}

            {props.resources && props.resources.length > 0 && (
              <AccordionItem value="resources" className="border-b-0">
                <AccordionTrigger className="px-4">
                  <h4 className="font-semibold text-sm">Resources</h4>
                </AccordionTrigger>
                <AccordionContent className="px-4">
                  <div className="space-y-2">
                    {props.resources.map((resource, i) => (
                      <a
                        key={i}
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3 rounded-lg bg-card hover:bg-accent/50 transition-colors border border-border"
                      >
                        <div className="flex items-center gap-3">
                          <span className="px-2 py-1 rounded bg-secondary/40 text-xs font-medium">
                            {resource.type}
                          </span>
                          <span className="text-sm">{resource.title}</span>
                        </div>
                        <ExternalLink className="w-4 h-4 text-muted-foreground" />
                      </a>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        </CardContent>
      </Card>

      {props.status !== "submitted" && props.status !== "graded" && (
        <Card className="bg-card">
          <CardContent className="p-6 space-y-4">
            <h4 className="font-semibold text-sm mb-4">Submit Your Work</h4>
            
            {(props.submission_type === "file" || props.submission_type === "multiple") && (
              <div className="space-y-2">
                <Label>Upload Files</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    multiple={props.submission_type === "multiple"}
                    onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-1">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PDF, DOC, DOCX, ZIP (max 50MB)
                    </p>
                  </label>
                </div>
                {selectedFiles.length > 0 && (
                  <div className="space-y-1">
                    {selectedFiles.map((file, i) => (
                      <div key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        {file.name} ({(file.size / 1024).toFixed(2)} KB)
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {(props.submission_type === "text" || props.submission_type === "multiple") && (
              <div className="space-y-2">
                <Label>Submission Text</Label>
                <Textarea
                  value={submissionText}
                  onChange={(e) => setSubmissionText(e.target.value)}
                  placeholder="Type or paste your submission here..."
                  className="min-h-[200px]"
                />
              </div>
            )}

            {(props.submission_type === "link" || props.submission_type === "multiple") && (
              <div className="space-y-2">
                <Label>Submission Link</Label>
                <Input
                  type="url"
                  value={submissionLink}
                  onChange={(e) => setSubmissionLink(e.target.value)}
                  placeholder="https://..."
                />
              </div>
            )}

            <Button 
              className="w-full"
              onClick={async () => {
                await forceSave();
                setShowSubmitDialog(true);
              }}
            >
              <Send className="w-4 h-4 mr-2" />
              Submit Assignment
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Submission</DialogTitle>
            <DialogDescription>
              Are you sure you want to submit this assignment? You won&apos;t be able to make changes after submission.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2 text-sm">
              {selectedFiles.length > 0 && (
                <div>
                  <span className="font-medium">Files: </span>
                  <span className="text-muted-foreground">{selectedFiles.length} file(s)</span>
                </div>
              )}
              {submissionText && (
                <div>
                  <span className="font-medium">Text: </span>
                  <span className="text-muted-foreground">{submissionText.length} characters</span>
                </div>
              )}
              {submissionLink && (
                <div>
                  <span className="font-medium">Link: </span>
                  <span className="text-muted-foreground break-all">{submissionLink}</span>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={async () => {
                await clearAssignmentProgress(props.assignment_id, studentId || undefined);
                setShowSubmitDialog(false);
                alert('Assignment submitted successfully!');
              }}
            >
              Confirm Submission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
