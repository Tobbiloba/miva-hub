"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Megaphone, Save, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";

interface Course {
  id: string;
  courseCode: string;
  title: string;
}

interface Department {
  id: string;
  name: string;
  code: string;
}

interface FormData {
  title: string;
  content: string;
  targetAudience: string;
  priority: string;
  courseId: string;
  departmentId: string;
  expiresAt: string;
  isActive: boolean;
}

const initialFormData: FormData = {
  title: "",
  content: "",
  targetAudience: "all",
  priority: "medium",
  courseId: "",
  departmentId: "",
  expiresAt: "",
  isActive: true,
};

const audienceOptions = [
  { value: "all", label: "All Users" },
  { value: "students", label: "Students Only" },
  { value: "faculty", label: "Faculty Only" },
  { value: "course_specific", label: "Specific Course" },
  { value: "department_specific", label: "Specific Department" },
];

const priorityOptions = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export default function CreateAnnouncementPage() {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [courses, setCourses] = useState<Course[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [coursesRes, deptsRes] = await Promise.all([
          fetch("/api/admin/courses"),
          fetch("/api/admin/departments"),
        ]);
        const coursesData = await coursesRes.json();
        const deptsData = await deptsRes.json();

        if (coursesData.success) setCourses(coursesData.data);
        if (deptsData.success) setDepartments(deptsData.data);
      } catch (error) {
        console.error("Error fetching options:", error);
        toast({
          title: "Error",
          description: "Failed to load form options",
          variant: "destructive",
        });
      } finally {
        setIsLoadingOptions(false);
      }
    };
    fetchOptions();
  }, []);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    }

    if (!formData.content.trim()) {
      newErrors.content = "Content is required";
    } else if (formData.content.trim().length < 10) {
      newErrors.content = "Content must be at least 10 characters";
    }

    if (!formData.targetAudience) {
      newErrors.targetAudience = "Target audience is required";
    }

    if (formData.targetAudience === "course_specific" && !formData.courseId) {
      newErrors.courseId = "Course is required for course-specific announcements";
    }

    if (formData.targetAudience === "department_specific" && !formData.departmentId) {
      newErrors.departmentId = "Department is required for department-specific announcements";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast({ title: "Validation Error", description: "Please fix the errors in the form", variant: "destructive" });
      return;
    }

    setIsLoading(true);

    try {
      const body: Record<string, unknown> = {
        title: formData.title,
        content: formData.content,
        targetAudience: formData.targetAudience,
        priority: formData.priority,
        isActive: formData.isActive,
      };

      if (formData.targetAudience === "course_specific" && formData.courseId) {
        body.courseId = formData.courseId;
      }
      if (formData.targetAudience === "department_specific" && formData.departmentId) {
        body.departmentId = formData.departmentId;
      }
      if (formData.expiresAt) {
        body.expiresAt = formData.expiresAt;
      }

      const response = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.success) {
        toast({ title: "Success", description: data.message });
        router.push("/admin/announcements");
      } else {
        toast({ title: "Error", description: data.message || "Failed to create announcement", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error creating announcement:", error);
      toast({ title: "Error", description: "Failed to create announcement. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingOptions) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/announcements">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Announcements
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Megaphone className="h-8 w-8 text-blue-600" />
            Create Announcement
          </h1>
          <p className="text-muted-foreground mt-1">
            Publish a new announcement to your audience
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Announcement Details</CardTitle>
          <CardDescription>
            Enter the details for the new announcement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Important Update Regarding Examinations"
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
              />
              {errors.title && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.title}
                </p>
              )}
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Label htmlFor="content">Content *</Label>
              <Textarea
                id="content"
                placeholder="Write the announcement content here..."
                rows={5}
                value={formData.content}
                onChange={(e) => handleInputChange("content", e.target.value)}
              />
              {errors.content && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.content}
                </p>
              )}
            </div>

            {/* Target Audience and Priority */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="targetAudience">Target Audience *</Label>
                <Select
                  value={formData.targetAudience}
                  onValueChange={(value) => {
                    handleInputChange("targetAudience", value);
                    // Clear conditional fields when audience changes
                    if (value !== "course_specific") setFormData((prev) => ({ ...prev, courseId: "" }));
                    if (value !== "department_specific") setFormData((prev) => ({ ...prev, departmentId: "" }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select audience" />
                  </SelectTrigger>
                  <SelectContent>
                    {audienceOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.targetAudience && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.targetAudience}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority *</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => handleInputChange("priority", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {priorityOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Conditional: Course selector */}
            {formData.targetAudience === "course_specific" && (
              <div className="space-y-2">
                <Label htmlFor="courseId">Course *</Label>
                <Select
                  value={formData.courseId}
                  onValueChange={(value) => handleInputChange("courseId", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.courseCode} - {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.courseId && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.courseId}
                  </p>
                )}
              </div>
            )}

            {/* Conditional: Department selector */}
            {formData.targetAudience === "department_specific" && (
              <div className="space-y-2">
                <Label htmlFor="departmentId">Department *</Label>
                <Select
                  value={formData.departmentId}
                  onValueChange={(value) => handleInputChange("departmentId", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.code} - {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.departmentId && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.departmentId}
                  </p>
                )}
              </div>
            )}

            {/* Expires At */}
            <div className="space-y-2">
              <Label htmlFor="expiresAt">Expiration Date (optional)</Label>
              <Input
                id="expiresAt"
                type="datetime-local"
                value={formData.expiresAt}
                onChange={(e) => handleInputChange("expiresAt", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty for announcements that never expire
              </p>
            </div>

            {/* Active Status */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => handleInputChange("isActive", !!checked)}
              />
              <Label htmlFor="isActive">
                Publish immediately (uncheck to save as draft)
              </Label>
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-4 pt-4 border-t">
              <Link href="/admin/announcements">
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Create Announcement
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
