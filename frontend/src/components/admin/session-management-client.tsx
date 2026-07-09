"use client";

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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Edit, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

interface AcademicSession {
  id: string;
  sessionName: string;
  currentSemester: "first" | "second";
  status: "upcoming" | "active" | "closed";
  isCurrent: boolean;
  firstSemStart: string | null;
  firstSemEnd: string | null;
  secondSemStart: string | null;
  secondSemEnd: string | null;
}

interface SessionFormData {
  currentSemester: "first" | "second";
  status: "upcoming" | "active" | "closed";
  isCurrent: boolean;
  firstSemStart: string;
  firstSemEnd: string;
  secondSemStart: string;
  secondSemEnd: string;
}

interface SessionManagementClientProps {
  children: React.ReactNode;
  session: AcademicSession;
  mode?: "edit" | "delete";
}

export function SessionManagementClient({
  children,
  session,
  mode = "edit",
}: SessionManagementClientProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<SessionFormData>({
    currentSemester: session.currentSemester,
    status: session.status,
    isCurrent: session.isCurrent,
    firstSemStart: session.firstSemStart ?? "",
    firstSemEnd: session.firstSemEnd ?? "",
    secondSemStart: session.secondSemStart ?? "",
    secondSemEnd: session.secondSemEnd ?? "",
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/admin/academic/sessions/${session.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currentSemester: formData.currentSemester,
            status: formData.status,
            isCurrent: formData.isCurrent,
            firstSemStart: formData.firstSemStart || null,
            firstSemEnd: formData.firstSemEnd || null,
            secondSemStart: formData.secondSemStart || null,
            secondSemEnd: formData.secondSemEnd || null,
          }),
        },
      );

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Session Updated",
          description: `${session.sessionName} has been updated successfully.`,
        });
        setIsOpen(false);
        router.refresh();
      } else {
        throw new Error(result.error || "Operation failed");
      }
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/admin/academic/sessions/${session.id}`,
        { method: "DELETE" },
      );

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Session Deleted",
          description: `${session.sessionName} has been deleted successfully.`,
        });
        router.refresh();
      } else {
        throw new Error(result.error || "Delete failed");
      }
    } catch (error) {
      toast({
        title: "Delete Failed",
        description:
          error instanceof Error ? error.message : "Failed to delete session",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (mode === "delete") {
    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete session?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the{" "}
              <strong>{session.sessionName}</strong> session. Sessions with
              existing enrollments or the current active session cannot be
              deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Session"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit {session.sessionName}
          </DialogTitle>
          <DialogDescription>
            Update semester, dates, status, and current-session flag. The
            session name cannot be changed.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Current Semester</Label>
                <Select
                  value={formData.currentSemester}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      currentSemester: value as "first" | "second",
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="first">First</SelectItem>
                    <SelectItem value="second">Second</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      status: value as "upcoming" | "active" | "closed",
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstSemStart">First Sem Start</Label>
                <Input
                  id="firstSemStart"
                  type="date"
                  value={formData.firstSemStart}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      firstSemStart: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="firstSemEnd">First Sem End</Label>
                <Input
                  id="firstSemEnd"
                  type="date"
                  value={formData.firstSemEnd}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      firstSemEnd: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="secondSemStart">Second Sem Start</Label>
                <Input
                  id="secondSemStart"
                  type="date"
                  value={formData.secondSemStart}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      secondSemStart: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="secondSemEnd">Second Sem End</Label>
                <Input
                  id="secondSemEnd"
                  type="date"
                  value={formData.secondSemEnd}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      secondSemEnd: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="isCurrent">Set as current session</Label>
                <p className="text-xs text-muted-foreground">
                  Makes this the active session. Any other current session is
                  cleared.
                </p>
              </div>
              <Switch
                id="isCurrent"
                checked={formData.isCurrent}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, isCurrent: checked }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
