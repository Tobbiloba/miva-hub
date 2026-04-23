"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileUploadZone } from "@/components/admin/file-upload-zone";
import {
  ArrowLeft,
  Upload,
  Globe,
  Link2,
  FolderOpen,
  Loader2,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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

export default function FacultyMaterialUploadPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<{ id: string; courseCode: string; title: string }[]>([]);
  const [courseId, setCourseId] = useState("");
  const [materialType, setMaterialType] = useState("");
  const [weekNumber, setWeekNumber] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [inputMode, setInputMode] = useState<"file" | "url">("file");
  const [externalUrl, setExternalUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const res = await fetch("/api/faculty/courses");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setCourses(data.data || []);
    } catch {
      toast.error("Failed to load courses");
    }
  };

  const isUrlValid = (() => {
    if (!externalUrl) return false;
    try {
      const parsed = new URL(externalUrl);
      return ["http:", "https:"].includes(parsed.protocol);
    } catch {
      return false;
    }
  })();

  const isFormValid = courseId && materialType && weekNumber && title;
  const canSubmit =
    isFormValid &&
    (inputMode === "file" ? selectedFile !== null : isUrlValid) &&
    !uploading;

  const handleFilesAdded = (files: File[]) => {
    if (files.length > 0) {
      setSelectedFile(files[0]);
      toast.success(`File selected: ${files[0].name}`);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("courseId", courseId);
      formData.append("materialType", materialType);
      formData.append("weekNumber", weekNumber);
      formData.append("title", title);
      formData.append("description", description);

      if (inputMode === "url") {
        formData.append("externalUrl", externalUrl);
      } else if (selectedFile) {
        formData.append("file", selectedFile);
      }

      const res = await fetch("/api/faculty/materials/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Upload failed");
      }

      toast.success(
        inputMode === "url"
          ? "External URL added as material"
          : "File uploaded successfully"
      );
      router.push("/faculty/materials");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/faculty/materials">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FolderOpen className="h-6 w-6 text-blue-600" />
            Upload Material
          </h1>
          <p className="text-muted-foreground">Add course material for your students</p>
        </div>
      </div>

      {/* Material Details */}
      <Card>
        <CardHeader>
          <CardTitle>Material Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Course *</Label>
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a course" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.courseCode} — {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Material Type *</Label>
              <Select value={materialType} onValueChange={setMaterialType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {MATERIAL_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Week *</Label>
              <Select value={weekNumber} onValueChange={setWeekNumber}>
                <SelectTrigger>
                  <SelectValue placeholder="Select week" />
                </SelectTrigger>
                <SelectContent>
                  {WEEK_OPTIONS.map((w) => (
                    <SelectItem key={w.value} value={w.value}>
                      {w.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Material title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Mode Toggle + Content */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Button
              variant={inputMode === "file" ? "default" : "outline"}
              size="sm"
              onClick={() => setInputMode("file")}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload File
            </Button>
            <Button
              variant={inputMode === "url" ? "default" : "outline"}
              size="sm"
              onClick={() => setInputMode("url")}
            >
              <Globe className="h-4 w-4 mr-2" />
              External URL
            </Button>
          </div>

          {inputMode === "file" ? (
            <div>
              <FileUploadZone onFilesSelected={handleFilesAdded} disabled={!isFormValid} />
              {selectedFile && (
                <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <Upload className="h-4 w-4" />
                  Selected: {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(1)} MB)
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="externalUrl">URL *</Label>
              <Input
                id="externalUrl"
                type="url"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=... or any public URL"
                disabled={!isFormValid}
              />
              {externalUrl && !isUrlValid && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> Enter a valid URL (http:// or https://)
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Paste a YouTube video, article, or any public URL. No upload or AI processing needed.
              </p>
            </div>
          )}

          <Button onClick={handleSubmit} disabled={!canSubmit} className="w-full">
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {inputMode === "url" ? "Saving..." : "Uploading..."}
              </>
            ) : (
              <>
                {inputMode === "url" ? (
                  <Link2 className="mr-2 h-4 w-4" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                {inputMode === "url" ? "Save URL as Material" : "Upload File"}
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
