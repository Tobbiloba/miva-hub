"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { ArrowRight, GraduationCap, Loader2, AlertTriangle } from "lucide-react";

interface DryRunData {
  currentSessionName: string;
  nextSessionName: string;
  totalActive: number;
  totalAdvancing: number;
  totalGraduating: number;
  levelAdvancement: Record<string, number>;
  graduatingByProgram: Record<string, number>;
}

export function EndSessionConfirmation({
  currentSessionName,
}: {
  currentSessionName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [preview, setPreview] = useState<DryRunData | null>(null);
  const [nextSessionName, setNextSessionName] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [previewError, setPreviewError] = useState<string | null>(null);

  const suggestNextSession = () => {
    if (!currentSessionName) return "";
    const match = currentSessionName.match(/^(\d{4})\/(\d{4})$/);
    if (!match) return "";
    return `${Number(match[1]) + 1}/${Number(match[2]) + 1}`;
  };

  const fetchPreview = async (sessionName: string) => {
    if (!sessionName.match(/^\d{4}\/\d{4}$/)) {
      setPreviewError("Session name must be in YYYY/YYYY format");
      return;
    }
    setLoading(true);
    setPreview(null);
    setPreviewError(null);
    try {
      const res = await fetch("/api/admin/academic/end-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: true, nextSessionName: sessionName }),
      });
      const data = await res.json();
      if (!data.success) {
        setPreviewError(data.error || "Failed to load preview");
        return;
      }
      setPreview(data.data);
    } catch {
      setPreviewError("Failed to load preview");
    } finally {
      setLoading(false);
    }
  };

  const executeEndSession = async () => {
    setExecuting(true);
    try {
      const res = await fetch("/api/admin/academic/end-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: false, nextSessionName }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error || "Failed to end session");
        return;
      }
      toast.success(data.message);
      setOpen(false);
      window.location.reload();
    } catch {
      toast.error("Failed to end session");
    } finally {
      setExecuting(false);
    }
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (isOpen) {
          const suggested = suggestNextSession();
          setNextSessionName(suggested);
          setConfirmation("");
          setPreview(null);
          setPreviewError(null);
          if (suggested) fetchPreview(suggested);
        }
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="destructive">
          <GraduationCap className="h-4 w-4 mr-2" />
          End Current Session
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            End Current Session
          </AlertDialogTitle>
          <AlertDialogDescription>
            This will graduate final-year students, advance all other students to
            the next level, close the current session, and activate the next one.
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="next-session">Next Session Name</Label>
            <div className="flex gap-2">
              <Input
                id="next-session"
                value={nextSessionName}
                onChange={(e) => setNextSessionName(e.target.value)}
                placeholder="e.g. 2026/2027"
                autoComplete="off"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchPreview(nextSessionName)}
                disabled={loading || !nextSessionName}
              >
                Preview
              </Button>
            </div>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">
                Loading preview...
              </span>
            </div>
          )}

          {previewError && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
              <p className="text-sm text-destructive">{previewError}</p>
            </div>
          )}

          {preview && (
            <div className="space-y-3">
              <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Session Transition</span>
                  <span className="text-sm">
                    {preview.currentSessionName}{" "}
                    <ArrowRight className="inline h-3 w-3 mx-1" />{" "}
                    {preview.nextSessionName}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Active</span>
                  <Badge variant="outline">{preview.totalActive}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Will Advance</span>
                  <Badge>{preview.totalAdvancing}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-destructive">
                    Will Graduate
                  </span>
                  <Badge variant="destructive">{preview.totalGraduating}</Badge>
                </div>
              </div>

              {Object.keys(preview.levelAdvancement).length > 0 && (
                <div className="rounded-lg border p-4">
                  <p className="text-sm font-medium mb-2">Level Advancement</p>
                  <div className="space-y-1">
                    {Object.entries(preview.levelAdvancement).map(
                      ([transition, count]) => (
                        <div
                          key={transition}
                          className="flex justify-between text-sm"
                        >
                          <span className="text-muted-foreground">
                            {transition}
                          </span>
                          <span>{count} students</span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {Object.keys(preview.graduatingByProgram).length > 0 && (
                <div className="rounded-lg border p-4">
                  <p className="text-sm font-medium mb-2">
                    Graduating by Program
                  </p>
                  <div className="space-y-1">
                    {Object.entries(preview.graduatingByProgram).map(
                      ([program, count]) => (
                        <div
                          key={program}
                          className="flex justify-between text-sm"
                        >
                          <span className="text-muted-foreground">
                            {program}
                          </span>
                          <span>{count} students</span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="confirm-session" className="text-sm">
                  Type <strong>CONFIRM</strong> to proceed
                </Label>
                <Input
                  id="confirm-session"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  placeholder="Type CONFIRM"
                  autoComplete="off"
                />
              </div>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => {
              setPreview(null);
              setConfirmation("");
              setNextSessionName("");
            }}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              executeEndSession();
            }}
            disabled={
              confirmation !== "CONFIRM" ||
              executing ||
              loading ||
              !preview
            }
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {executing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              "End Session & Advance"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
