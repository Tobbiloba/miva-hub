"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FileText,
  ArrowLeft,
  AlertCircle,
  Save,
  Loader2,
  Trash2,
} from "lucide-react";
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
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";

export default function EditAssignmentPage() {
  const router = useRouter();
  const params = useParams();
  const assignmentId = params.assignmentId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [courseInfo, setCourseInfo] = useState({ courseCode: "", courseTitle: "" });
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    instructions: "",
    totalPoints: 100,
    dueDate: "",
    dueTime: "23:59",
    isPublished: false,
    allowLateSubmission: false,
    lateSubmissionPenalty: 10,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchAssignment();
  }, [assignmentId]);

  const fetchAssignment = async () => {
    try {
      const res = await fetch(`/api/faculty/assignments/${assignmentId}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to load assignment");
      }
      const { data } = await res.json();
      const a = data.assignment;
      const dueDate = new Date(a.dueDate);

      setCourseInfo({ courseCode: data.courseCode, courseTitle: data.courseTitle });
      setFormData({
        title: a.title || "",
        description: a.description || "",
        instructions: a.instructions || "",
        totalPoints: a.totalPoints,
        dueDate: dueDate.toISOString().split("T")[0],
        dueTime: dueDate.toTimeString().slice(0, 5),
        isPublished: a.isPublished,
        allowLateSubmission: a.allowLateSubmission,
        lateSubmissionPenalty: parseFloat(a.lateSubmissionPenalty) || 10,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load assignment");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = "Title is required";
    if (formData.totalPoints <= 0) newErrors.totalPoints = "Points must be > 0";
    if (!formData.dueDate) newErrors.dueDate = "Due date is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/faculty/assignments/${assignmentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          instructions: formData.instructions,
          totalPoints: formData.totalPoints,
          dueDate: new Date(`${formData.dueDate}T${formData.dueTime}`).toISOString(),
          isPublished: formData.isPublished,
          allowLateSubmission: formData.allowLateSubmission,
          lateSubmissionPenalty: formData.lateSubmissionPenalty,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update");
      }

      toast.success("Assignment updated");
      router.push("/faculty/assignments");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update assignment");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/faculty/assignments/${assignmentId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete");
      }

      toast.success("Assignment deleted");
      router.push("/faculty/assignments");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete assignment");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/faculty/assignments">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6 text-blue-600" />
              Edit Assignment
            </h1>
            <p className="text-muted-foreground">
              {courseInfo.courseCode} — {courseInfo.courseTitle}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={deleting}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete assignment?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete &quot;{formData.title}&quot;. This
                  cannot be undone. If students have already submitted, deletion
                  will be blocked.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Changes
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assignment Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange("title", e.target.value)}
              className={errors.title ? "border-red-500" : ""}
            />
            {errors.title && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> {errors.title}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="instructions">Instructions</Label>
            <Textarea
              id="instructions"
              value={formData.instructions}
              onChange={(e) => handleInputChange("instructions", e.target.value)}
              rows={5}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Grading & Schedule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="totalPoints">Total Points *</Label>
              <Input
                id="totalPoints"
                type="number"
                min="1"
                value={formData.totalPoints}
                onChange={(e) => handleInputChange("totalPoints", parseInt(e.target.value) || 0)}
                className={errors.totalPoints ? "border-red-500" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="isPublished"
                  checked={formData.isPublished}
                  onCheckedChange={(checked) => handleInputChange("isPublished", checked === true)}
                />
                <Label htmlFor="isPublished" className="cursor-pointer">
                  Published (visible to students)
                </Label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date *</Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => handleInputChange("dueDate", e.target.value)}
                className={errors.dueDate ? "border-red-500" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueTime">Due Time</Label>
              <Input
                id="dueTime"
                type="time"
                value={formData.dueTime}
                onChange={(e) => handleInputChange("dueTime", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="allowLateSubmission"
                checked={formData.allowLateSubmission}
                onCheckedChange={(checked) => handleInputChange("allowLateSubmission", checked === true)}
              />
              <Label htmlFor="allowLateSubmission">Allow late submissions</Label>
            </div>
            {formData.allowLateSubmission && (
              <div className="ml-6 space-y-2">
                <Label htmlFor="lateSubmissionPenalty">Late Penalty (%)</Label>
                <Input
                  id="lateSubmissionPenalty"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.lateSubmissionPenalty}
                  onChange={(e) => handleInputChange("lateSubmissionPenalty", parseInt(e.target.value) || 0)}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
