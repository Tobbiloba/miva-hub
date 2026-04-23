"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Plus, Loader2, Trash2 } from "lucide-react";

interface Course {
  id: string;
  courseCode: string;
  title: string;
}

interface Enrollment {
  id: string;
  courseCode: string;
  courseTitle: string;
  semester: string;
  academicYear: string;
  status: string;
  finalGrade: string | null;
}

interface Props {
  studentId: string;
  academicYear: string | null;
  enrollments: Enrollment[];
}

const semesterOptions = [
  { value: "first", label: "First Semester" },
  { value: "second", label: "Second Semester" },
];

export function EnrollStudentDialog({
  studentId,
  academicYear,
  enrollments,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [courseId, setCourseId] = useState("");
  const [semester, setSemester] = useState("first");
  const [enrollAcademicYear, setEnrollAcademicYear] = useState(
    academicYear ?? ""
  );

  useEffect(() => {
    if (open && courses.length === 0) {
      setLoadingCourses(true);
      fetch("/api/admin/courses")
        .then((r) => r.json())
        .then((data) => {
          if (data.success) setCourses(data.data);
        })
        .catch(() => toast.error("Failed to load courses"))
        .finally(() => setLoadingCourses(false));
    }
  }, [open, courses.length]);

  const handleEnroll = async () => {
    if (!courseId || !semester || !enrollAcademicYear) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          courseId,
          semester,
          academicYear: enrollAcademicYear,
        }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(data.message);
        setOpen(false);
        setCourseId("");
        router.refresh();
      } else {
        toast.error(data.error || "Failed to enroll student");
      }
    } catch {
      toast.error("Failed to enroll student");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (enrollmentId: string) => {
    setDeletingId(enrollmentId);
    try {
      const res = await fetch(`/api/admin/enrollments/${enrollmentId}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (data.success) {
        toast.success(data.message);
        router.refresh();
      } else {
        toast.error(data.error || "Failed to delete enrollment");
      }
    } catch {
      toast.error("Failed to delete enrollment");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Enroll in Course
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enroll Student in Course</DialogTitle>
              <DialogDescription>
                Select a course and semester to create a new enrollment.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Course *</Label>
                {loadingCourses ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading courses...
                  </div>
                ) : (
                  <Select value={courseId} onValueChange={setCourseId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.courseCode} - {c.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Semester *</Label>
                  <Select value={semester} onValueChange={setSemester}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {semesterOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Academic Year *</Label>
                  <Input
                    value={enrollAcademicYear}
                    onChange={(e) => setEnrollAcademicYear(e.target.value)}
                    placeholder="e.g., 2025/2026"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleEnroll}
                disabled={loading || !courseId}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enrolling...
                  </>
                ) : (
                  "Enroll"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Per-enrollment delete buttons */}
      {enrollments.length > 0 && (
        <div className="space-y-1">
          {enrollments
            .filter((e) => e.status === "enrolled")
            .map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between text-sm py-1 px-2 rounded hover:bg-muted/50"
              >
                <span>
                  {e.courseCode} &middot; {e.semester} &middot;{" "}
                  {e.academicYear}
                </span>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    >
                      {deletingId === e.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove Enrollment</AlertDialogTitle>
                      <AlertDialogDescription>
                        Remove {e.courseCode} enrollment for {e.semester}{" "}
                        {e.academicYear}?{" "}
                        {e.finalGrade &&
                          "This enrollment has a grade recorded."}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(e.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Remove
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
