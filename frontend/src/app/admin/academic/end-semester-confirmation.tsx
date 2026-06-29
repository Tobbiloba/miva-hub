"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { ArrowRight, Loader2 } from "lucide-react";

interface DryRunData {
  sessionName: string;
  currentSemester: string;
  targetSemester: string;
  totalAffected: number;
  byLevel: Record<number, number>;
  byProgram: Record<string, number>;
}

export function EndSemesterConfirmation() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [preview, setPreview] = useState<DryRunData | null>(null);
  const [confirmation, setConfirmation] = useState("");

  const fetchPreview = async () => {
    setLoading(true);
    setPreview(null);
    setConfirmation("");
    try {
      const res = await fetch("/api/admin/academic/end-semester", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: true }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error || "Failed to load preview");
        setOpen(false);
        return;
      }
      setPreview(data.data);
    } catch {
      toast.error("Failed to load preview");
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const executeEndSemester = async () => {
    setExecuting(true);
    try {
      const res = await fetch("/api/admin/academic/end-semester", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: false }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error || "Failed to end semester");
        return;
      }
      toast.success(data.message);
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Failed to end semester");
    } finally {
      setExecuting(false);
    }
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (isOpen) fetchPreview();
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="default">
          <ArrowRight className="h-4 w-4 mr-2" />
          End Current Semester
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>End Current Semester</AlertDialogTitle>
          <AlertDialogDescription>
            This will move all active students from the first semester to the
            second semester. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">
              Loading preview...
            </span>
          </div>
        )}

        {preview && (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Session</span>
                <Badge variant="outline">{preview.sessionName}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Transition</span>
                <span className="text-sm">
                  First Semester <ArrowRight className="inline h-3 w-3 mx-1" />{" "}
                  Second Semester
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Students Affected</span>
                <Badge>{preview.totalAffected}</Badge>
              </div>
            </div>

            {Object.keys(preview.byLevel).length > 0 && (
              <div className="rounded-lg border p-4">
                <p className="text-sm font-medium mb-2">Breakdown by Level</p>
                <div className="space-y-1">
                  {Object.entries(preview.byLevel)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([level, count]) => (
                      <div
                        key={level}
                        className="flex justify-between text-sm"
                      >
                        <span className="text-muted-foreground">
                          {level}L
                        </span>
                        <span>{count} students</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="confirm-semester" className="text-sm">
                Type <strong>CONFIRM</strong> to proceed
              </Label>
              <Input
                id="confirm-semester"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                placeholder="Type CONFIRM"
                autoComplete="off"
              />
            </div>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => {
              setPreview(null);
              setConfirmation("");
            }}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              executeEndSemester();
            }}
            disabled={confirmation !== "CONFIRM" || executing || loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {executing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              "End Semester"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
