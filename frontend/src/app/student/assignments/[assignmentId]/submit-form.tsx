"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Upload,
  Save,
  Send,
  AlertCircle,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface SubmitFormProps {
  assignment: any;
  isOverdue: boolean;
  studentId: string;
}

export default function SubmitForm({ assignment, isOverdue, studentId }: SubmitFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionText, setSubmissionText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submissionType = assignment.submissionType || 'file_upload';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        setError("File size must be less than 10MB");
        return;
      }

      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'application/zip',
        'application/x-zip-compressed'
      ];

      if (!allowedTypes.includes(file.type)) {
        setError("Invalid file type. Please upload PDF, DOC, DOCX, TXT, or ZIP files.");
        return;
      }

      setSelectedFile(file);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Validate submission
      if (submissionType === 'text_entry' || submissionType === 'online_test') {
        if (!submissionText.trim()) {
          setError("Text submission is required");
          return;
        }
      }

      if (submissionType === 'file_upload') {
        if (!selectedFile) {
          setError("File upload is required");
          return;
        }
      }

      // Prepare form data
      const formData = new FormData();
      if (submissionText.trim()) {
        formData.append("submissionText", submissionText);
      }
      if (selectedFile) {
        formData.append("submissionFile", selectedFile);
      }

      // Submit assignment
      const response = await fetch(`/api/student/assignments/${assignment.id}/submit`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Submission failed');
      }

      setSuccess(true);
      
      // Redirect after successful submission
      setTimeout(() => {
        router.push('/student/assignments');
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during submission');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    // TODO: Implement draft saving functionality
    alert("Draft saving functionality coming soon!");
  };

  if (success) {
    return (
      <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
            <CheckCircle className="h-5 w-5" />
            Assignment Submitted Successfully!
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-green-700 dark:text-green-300">
            Your assignment has been submitted successfully. You will be redirected to the assignments page.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Submit Assignment
          {isOverdue && (
            <Badge variant="destructive" className="ml-2">
              Late Submission
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">{error}</span>
              </div>
            </div>
          )}

          {(submissionType === 'text_entry' || submissionType === 'online_test') && (
            <div>
              <Label htmlFor="submissionText">Your Response</Label>
              <Textarea
                id="submissionText"
                value={submissionText}
                onChange={(e) => setSubmissionText(e.target.value)}
                placeholder="Enter your assignment response here..."
                className="mt-1"
                rows={6}
                required
                disabled={isSubmitting}
              />
            </div>
          )}
          
          {submissionType === 'file_upload' && (
            <div>
              <Label htmlFor="submissionFile">Upload File</Label>
              <Input
                id="submissionFile"
                type="file"
                onChange={handleFileChange}
                className="mt-1"
                accept=".pdf,.doc,.docx,.txt,.zip"
                required
                disabled={isSubmitting}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Accepted file types: PDF, DOC, DOCX, TXT, ZIP (max 10MB)
              </p>
              {selectedFile && (
                <p className="text-sm text-green-600 mt-1">
                  Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>
          )}
          
          <div className="flex gap-2">
            <Button 
              type="submit" 
              className="flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              {isSubmitting ? 'Submitting...' : 'Submit Assignment'}
            </Button>
            <Button 
              type="button" 
              variant="outline"
              onClick={handleSaveDraft}
              disabled={isSubmitting}
            >
              <Save className="mr-2 h-4 w-4" />
              Save Draft
            </Button>
          </div>
          
          {isOverdue && assignment.lateSubmissionPenalty && (
            <div className="text-sm text-orange-600 bg-orange-50 dark:bg-orange-950 p-3 rounded-lg">
              <AlertCircle className="h-4 w-4 inline mr-1" />
              Late submission penalty: {assignment.lateSubmissionPenalty}% will be deducted from your grade.
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}