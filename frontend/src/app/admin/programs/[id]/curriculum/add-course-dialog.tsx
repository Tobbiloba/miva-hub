"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

interface Course {
  id: string;
  courseCode: string;
  title: string;
  credits: number;
}

interface AddCourseDialogProps {
  programId: string;
  level: number;
  semester: "first" | "second";
  courses: Course[];
  existingCourseIds: string[];
}

export function AddCourseDialog({
  programId,
  level,
  semester,
  courses,
  existingCourseIds,
}: AddCourseDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [courseId, setCourseId] = useState("");
  const [isCompulsory, setIsCompulsory] = useState(true);
  const [orderInSemester, setOrderInSemester] = useState("");

  // Filter out courses already in this cell
  const availableCourses = courses.filter(
    (c) => !existingCourseIds.includes(c.id),
  );

  const handleSubmit = async () => {
    if (!courseId) {
      toast.error("Please select a course");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/programs/${programId}/curriculum`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          level,
          semester,
          isCompulsory,
          orderInSemester: orderInSemester
            ? parseInt(orderInSemester, 10)
            : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to add course");
        return;
      }

      toast.success(data.message || "Course added to curriculum");
      setOpen(false);
      setCourseId("");
      setIsCompulsory(true);
      setOrderInSemester("");
      router.refresh();
    } catch {
      toast.error("Failed to add course");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full mt-1 text-xs">
          <Plus className="h-3 w-3 mr-1" />
          Add Course
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Add Course to {level}L {semester === "first" ? "First" : "Second"}{" "}
            Semester
          </DialogTitle>
          <DialogDescription>
            Select a course to map to this program&apos;s curriculum.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Course</Label>
            {availableCourses.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                All available courses have been mapped to this cell.
              </p>
            ) : (
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a course..." />
                </SelectTrigger>
                <SelectContent>
                  {availableCourses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.courseCode} — {course.title} ({course.credits} cr)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is-compulsory"
              checked={isCompulsory}
              onCheckedChange={(checked) => setIsCompulsory(checked === true)}
            />
            <Label htmlFor="is-compulsory" className="cursor-pointer">
              Compulsory course
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="order">Display Order (optional)</Label>
            <Input
              id="order"
              type="number"
              min="1"
              placeholder="e.g. 1, 2, 3..."
              value={orderInSemester}
              onChange={(e) => setOrderInSemester(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !courseId}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Add Course
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
