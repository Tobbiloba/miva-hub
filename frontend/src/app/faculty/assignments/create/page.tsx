"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  FileText,
  Calendar,
  Save,
  Eye,
  ArrowLeft,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

interface AssignmentFormData {
  title: string;
  description: string;
  instructions: string;
  assignmentType: string;
  totalPoints: number;
  dueDate: string;
  dueTime: string;
  submissionType: string;
  allowLateSubmission: boolean;
  lateSubmissionPenalty: number;
  weekNumber?: number;
  moduleNumber?: number;
  courseId: string;
}

const ASSIGNMENT_TYPES = [
  { value: "homework", label: "Homework" },
  { value: "project", label: "Project" },
  { value: "quiz", label: "Quiz" },
  { value: "exam", label: "Exam" },
  { value: "presentation", label: "Presentation" },
  { value: "lab", label: "Lab Exercise" },
  { value: "essay", label: "Essay" },
];

const SUBMISSION_TYPES = [
  { value: "file_upload", label: "File Upload" },
  { value: "text_entry", label: "Text Entry" },
  { value: "online_test", label: "Online Test" },
  { value: "in_person", label: "In-Person Submission" },
];

export default function CreateAssignmentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = searchParams.get("courseId");

  const [isLoading, setIsLoading] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [formData, setFormData] = useState<AssignmentFormData>({
    title: "",
    description: "",
    instructions: "",
    assignmentType: "homework",
    totalPoints: 100,
    dueDate: "",
    dueTime: "23:59",
    submissionType: "file_upload",
    allowLateSubmission: false,
    lateSubmissionPenalty: 10,
    courseId: courseId || "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Fetch faculty courses for course selection
    fetchFacultyCourses();
    
    // Set default due date to next week
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    setFormData(prev => ({
      ...prev,
      dueDate: nextWeek.toISOString().split('T')[0]
    }));
  }, []);

  const fetchFacultyCourses = async () => {
    try {
      // This would fetch from faculty dashboard API
      // For now, using placeholder
      setCourses([
        { id: "1", courseCode: "CS101", title: "Introduction to Programming" },
        { id: "2", courseCode: "CS201", title: "Data Structures" },
        { id: "3", courseCode: "MATH201", title: "Calculus II" },
      ]);
    } catch (error) {
      toast.error("Failed to load courses");
    }
  };

  const handleInputChange = (field: keyof AssignmentFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "Assignment title is required";
    }

    if (!formData.courseId) {
      newErrors.courseId = "Please select a course";
    }

    if (!formData.dueDate) {
      newErrors.dueDate = "Due date is required";
    } else {
      const dueDateTime = new Date(`${formData.dueDate}T${formData.dueTime}`);
      if (dueDateTime <= new Date()) {
        newErrors.dueDate = "Due date must be in the future";
      }
    }

    if (formData.totalPoints <= 0) {
      newErrors.totalPoints = "Points must be greater than 0";
    }

    if (formData.allowLateSubmission && (formData.lateSubmissionPenalty < 0 || formData.lateSubmissionPenalty > 100)) {
      newErrors.lateSubmissionPenalty = "Penalty must be between 0 and 100";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (isDraft: boolean = false) => {
    if (!isDraft && !validateForm()) {
      toast.error("Please fix the errors before submitting");
      return;
    }

    setIsLoading(true);
    try {
      const assignmentData = {
        ...formData,
        dueDate: new Date(`${formData.dueDate}T${formData.dueTime}`).toISOString(),
        isPublished: !isDraft,
      };

      // API call to create assignment would go here
      const response = await fetch("/api/faculty/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assignmentData),
      });

      if (response.ok) {
        toast.success(isDraft ? "Assignment saved as draft" : "Assignment created successfully");
        router.push("/faculty/assignments");
      } else {
        throw new Error("Failed to create assignment");
      }
    } catch (error) {
      toast.error("Failed to create assignment");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/faculty/assignments">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Assignments
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <FileText className="h-8 w-8 text-blue-600" />
              Create Assignment
            </h1>
            <p className="text-muted-foreground">Create a new assignment for your students</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleSubmit(true)} disabled={isLoading}>
            <Save className="mr-2 h-4 w-4" />
            Save as Draft
          </Button>
          <Button onClick={() => handleSubmit(false)} disabled={isLoading}>
            <CheckCircle className="mr-2 h-4 w-4" />
            {isLoading ? "Creating..." : "Create Assignment"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Form */}
        <div className="md:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Assignment Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  placeholder="Enter assignment title"
                  className={errors.title ? "border-red-500" : ""}
                />
                {errors.title && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.title}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="courseId">Course *</Label>
                  <Select value={formData.courseId} onValueChange={(value) => handleInputChange("courseId", value)}>
                    <SelectTrigger className={errors.courseId ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select a course" />
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
                    <p className="text-sm text-red-500">{errors.courseId}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assignmentType">Assignment Type</Label>
                  <Select value={formData.assignmentType} onValueChange={(value) => handleInputChange("assignmentType", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSIGNMENT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  placeholder="Brief description of the assignment"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="instructions">Instructions</Label>
                <Textarea
                  id="instructions"
                  value={formData.instructions}
                  onChange={(e) => handleInputChange("instructions", e.target.value)}
                  placeholder="Detailed instructions for students"
                  rows={6}
                />
              </div>
            </CardContent>
          </Card>

          {/* Grading & Submission */}
          <Card>
            <CardHeader>
              <CardTitle>Grading & Submission</CardTitle>
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
                    onChange={(e) => handleInputChange("totalPoints", parseInt(e.target.value))}
                    className={errors.totalPoints ? "border-red-500" : ""}
                  />
                  {errors.totalPoints && (
                    <p className="text-sm text-red-500">{errors.totalPoints}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="submissionType">Submission Type</Label>
                  <Select value={formData.submissionType} onValueChange={(value) => handleInputChange("submissionType", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUBMISSION_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="allowLateSubmission"
                    checked={formData.allowLateSubmission}
                    onCheckedChange={(checked) => handleInputChange("allowLateSubmission", checked)}
                  />
                  <Label htmlFor="allowLateSubmission">Allow late submissions</Label>
                </div>

                {formData.allowLateSubmission && (
                  <div className="ml-6 space-y-2">
                    <Label htmlFor="lateSubmissionPenalty">Late Submission Penalty (%)</Label>
                    <Input
                      id="lateSubmissionPenalty"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.lateSubmissionPenalty}
                      onChange={(e) => handleInputChange("lateSubmissionPenalty", parseInt(e.target.value))}
                      className={errors.lateSubmissionPenalty ? "border-red-500" : ""}
                    />
                    {errors.lateSubmissionPenalty && (
                      <p className="text-sm text-red-500">{errors.lateSubmissionPenalty}</p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Schedule & Organization */}
          <Card>
            <CardHeader>
              <CardTitle>Schedule & Organization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                  {errors.dueDate && (
                    <p className="text-sm text-red-500">{errors.dueDate}</p>
                  )}
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="weekNumber">Week Number (Optional)</Label>
                  <Input
                    id="weekNumber"
                    type="number"
                    min="1"
                    max="16"
                    value={formData.weekNumber || ""}
                    onChange={(e) => handleInputChange("weekNumber", e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="e.g., 3"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="moduleNumber">Module Number (Optional)</Label>
                  <Input
                    id="moduleNumber"
                    type="number"
                    min="1"
                    value={formData.moduleNumber || ""}
                    onChange={(e) => handleInputChange("moduleNumber", e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="e.g., 2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-medium">{formData.title || "Assignment Title"}</h4>
                <p className="text-sm text-muted-foreground">
                  {formData.description || "Assignment description"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="outline">{ASSIGNMENT_TYPES.find(t => t.value === formData.assignmentType)?.label}</Badge>
                <Badge variant="secondary">{formData.totalPoints} pts</Badge>
              </div>

              {formData.dueDate && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Due: {new Date(`${formData.dueDate}T${formData.dueTime}`).toLocaleString()}</span>
                </div>
              )}

              {formData.allowLateSubmission && (
                <div className="text-sm text-orange-600">
                  Late submissions allowed ({formData.lateSubmissionPenalty}% penalty)
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">💡 Tips for Better Assignments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="space-y-1">
                <p className="font-medium">Clear Instructions</p>
                <p className="text-muted-foreground">Provide detailed, step-by-step instructions to avoid confusion.</p>
              </div>
              <div className="space-y-1">
                <p className="font-medium">Realistic Timeline</p>
                <p className="text-muted-foreground">Give students adequate time to complete quality work.</p>
              </div>
              <div className="space-y-1">
                <p className="font-medium">Point Distribution</p>
                <p className="text-muted-foreground">Align points with the assignment&apos;s complexity and importance.</p>
              </div>
            </CardContent>
          </Card>

          {/* Save Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Publishing Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => handleSubmit(true)}
                  disabled={isLoading}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save as Draft
                </Button>
                <p className="text-xs text-muted-foreground">
                  Save your progress without publishing to students
                </p>
              </div>

              <div className="space-y-2">
                <Button 
                  className="w-full justify-start"
                  onClick={() => handleSubmit(false)}
                  disabled={isLoading || !formData.title || !formData.courseId}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Publish Assignment
                </Button>
                <p className="text-xs text-muted-foreground">
                  Make the assignment visible to students immediately
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}