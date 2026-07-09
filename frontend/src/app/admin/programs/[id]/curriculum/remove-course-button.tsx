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
import { Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

interface RemoveCourseButtonProps {
  programId: string;
  curriculumId: string;
  courseCode: string;
  level: number;
  semester: string;
}

export function RemoveCourseButton({
  programId,
  curriculumId,
  courseCode,
  level,
  semester,
}: RemoveCourseButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleRemove = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/programs/${programId}/curriculum/${curriculumId}`,
        { method: "DELETE" },
      );

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to remove course");
        return;
      }

      toast.success(`${courseCode} removed from curriculum`);
      router.refresh();
    } catch {
      toast.error("Failed to remove course");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 shrink-0 text-muted-foreground hover:text-destructive"
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <X className="h-3 w-3" />
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove {courseCode}?</AlertDialogTitle>
          <AlertDialogDescription>
            This will remove {courseCode} from the {level}L{" "}
            {semester === "first" ? "First" : "Second"} Semester curriculum.
            This action can be undone by re-adding the course.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleRemove}>Remove</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
