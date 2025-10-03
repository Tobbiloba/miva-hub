"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CourseSelector } from "@/components/admin/course-selector";
import { FileUploadZone } from "@/components/admin/file-upload-zone";
import { 
  Upload, 
  ArrowLeft, 
  FileText,
  Settings,
  CheckCircle
} from "lucide-react";
import Link from "next/link";

const MATERIAL_TYPES = [
  { value: "syllabus", label: "Syllabus" },
  { value: "lecture", label: "Lecture Notes" },
  { value: "assignment", label: "Assignment" },
  { value: "resource", label: "Resource Material" },
  { value: "reading", label: "Required Reading" },
  { value: "exam", label: "Exam Material" },
];

const WEEK_OPTIONS = Array.from({ length: 16 }, (_, i) => ({
  value: (i + 1).toString(),
  label: `Week ${i + 1}`,
}));

export default function ContentUploadPage() {
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [materialType, setMaterialType] = useState<string>("");
  const [weekNumber, setWeekNumber] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  const handleFilesSelected = async (files: File[]) => {
    if (!selectedCourse || !materialType || !weekNumber || !title) {
      toast.error("Please fill in all required fields before uploading files");
      return;
    }

    setUploading(true);

    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('courseId', selectedCourse);
        formData.append('materialType', materialType);
        formData.append('weekNumber', weekNumber);
        formData.append('title', title);
        formData.append('description', description);

        const response = await fetch('/api/content/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }

        await response.json();
        toast.success(`${file.name} uploaded successfully`);
      }

      // Reset form after successful upload
      setTitle("");
      setDescription("");
      toast.success("All files uploaded successfully!");
      
    } catch (error) {
      console.error('Upload error:', error);
      toast.error("Failed to upload files. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const isFormValid = selectedCourse && materialType && weekNumber && title;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/admin">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Upload Course Materials</h1>
          <p className="text-muted-foreground">
            Upload and process educational content for your courses
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Upload Configuration */}
        <div className="lg:col-span-1 space-y-6">
          {/* Course Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Course Selection
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CourseSelector 
                onCourseSelect={setSelectedCourse}
                selectedCourse={selectedCourse}
              />
            </CardContent>
          </Card>

          {/* Material Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Material Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="materialType">Material Type *</Label>
                <Select value={materialType} onValueChange={setMaterialType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select material type" />
                  </SelectTrigger>
                  <SelectContent>
                    {MATERIAL_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="week">Week Number *</Label>
                <Select value={weekNumber} onValueChange={setWeekNumber}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select week" />
                  </SelectTrigger>
                  <SelectContent>
                    {WEEK_OPTIONS.map((week) => (
                      <SelectItem key={week.value} value={week.value}>
                        {week.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter material title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter material description (optional)"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Upload Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Upload Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Course Selected</span>
                  <div className={`w-2 h-2 rounded-full ${selectedCourse ? 'bg-green-500' : 'bg-gray-300'}`} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Material Type</span>
                  <div className={`w-2 h-2 rounded-full ${materialType ? 'bg-green-500' : 'bg-gray-300'}`} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Week Number</span>
                  <div className={`w-2 h-2 rounded-full ${weekNumber ? 'bg-green-500' : 'bg-gray-300'}`} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Title</span>
                  <div className={`w-2 h-2 rounded-full ${title ? 'bg-green-500' : 'bg-gray-300'}`} />
                </div>
              </div>
              
              {isFormValid && (
                <div className="mt-4 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Ready to upload files!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* File Upload Area */}
        <div className="lg:col-span-2">
          <FileUploadZone
            onFilesSelected={handleFilesSelected}
            disabled={!isFormValid || uploading}
          />

          {!isFormValid && (
            <Card className="mt-4">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <Upload className="h-4 w-4" />
                  <p className="text-sm">
                    Please complete the course selection and material details before uploading files.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}