"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
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
  CheckCircle,
  X,
  AlertCircle,
  Brain,
  Zap,
  Database
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

interface SelectedFile {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  uploadProgress: number;
  processingProgress: number;
  processingJobId?: string;
  materialId?: string;
  processingPhase?: string;
  error?: string;
}

export default function ContentUploadPage() {
  const router = useRouter();
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [materialType, setMaterialType] = useState<string>("");
  const [weekNumber, setWeekNumber] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [uploading, setUploading] = useState(false);

  // Auto-redirect state
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);
  const [redirectTarget, setRedirectTarget] = useState<string | null>(null);
  const [redirectTimer, setRedirectTimer] = useState<NodeJS.Timeout | null>(null);

  // Polling interval for tracking processing progress
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  // Function to get processing phase details
  const getProcessingPhaseDetails = (phase: string, fileType: string) => {
    const phases = {
      'starting': { icon: Zap, label: 'Initializing AI processing...', color: 'text-blue-500' },
      'downloading': { icon: Upload, label: 'Downloading from cloud storage...', color: 'text-blue-500' },
      'extracting': { icon: FileText, label: `Extracting ${fileType.includes('pdf') ? 'text from PDF' : fileType.includes('video') ? 'audio from video' : 'content'}...`, color: 'text-purple-500' },
      'analyzing': { icon: Brain, label: 'AI analysis in progress...', color: 'text-green-500' },
      'embedding': { icon: Database, label: 'Generating vector embeddings...', color: 'text-orange-500' },
      'storing': { icon: Database, label: 'Saving to knowledge base...', color: 'text-blue-500' },
      'completed': { icon: CheckCircle, label: 'Processing complete!', color: 'text-green-500' }
    };
    
    const lowercasePhase = phase.toLowerCase();
    for (const [key, details] of Object.entries(phases)) {
      if (lowercasePhase.includes(key)) {
        return details;
      }
    }
    
    return { icon: Brain, label: phase || 'Processing...', color: 'text-blue-500' };
  };

  // Function to estimate processing time based on file type and size
  const getEstimatedTime = (fileType: string, fileSize: number) => {
    const sizeMB = fileSize / (1024 * 1024);
    let timePerMB = 2; // seconds per MB base
    
    if (fileType.includes('pdf')) {
      timePerMB = 1.5; // PDFs are faster
    } else if (fileType.includes('video')) {
      timePerMB = 3; // Videos take longer
    }
    
    const estimatedSeconds = Math.max(sizeMB * timePerMB, 10); // minimum 10 seconds
    return estimatedSeconds < 60 ? `~${Math.round(estimatedSeconds)}s` : `~${Math.round(estimatedSeconds / 60)}m`;
  };

  // Function to check job status directly (fallback when SSE fails)
  const checkJobStatus = async (fileId: string, processingJobId: string) => {
    try {
      const CONTENT_PROCESSOR_URL = process.env.NEXT_PUBLIC_CONTENT_PROCESSOR_URL || 'http://localhost:8082';
      const response = await fetch(`${CONTENT_PROCESSOR_URL}/processing-status/${processingJobId}`);
      
      if (response.ok) {
        const data = await response.json();
        
        setSelectedFiles(prev => prev.map(f => {
          if (f.id === fileId) {
            if (data.status === 'completed') {
              return {
                ...f,
                status: 'completed',
                progress: 100,
                processingProgress: 100,
                processingPhase: 'Processing complete!',
                // Preserve materialId and other important data
                materialId: f.materialId || data.materialId
              };
            } else if (data.status === 'failed') {
              return {
                ...f,
                status: 'error',
                error: data.error_message || 'Processing failed'
              };
            } else if (data.status === 'processing') {
              return {
                ...f,
                status: 'processing',
                progress: Math.min(90, 10 + (data.progress || 0) * 0.8), // Scale progress
                processingProgress: data.progress || 0,
                processingPhase: data.phase || 'Processing...',
              };
            }
          }
          return f;
        }));
        
        return data.status;
      }
    } catch (error) {
      console.error('Failed to check job status:', error);
    }
    return null;
  };

  // Simple polling to check processing status
  const startPolling = () => {
    if (pollingInterval) return; // Already polling
    
    const interval = setInterval(async () => {
      const processingFiles = selectedFiles.filter(f => f.status === 'processing' && f.processingJobId);
      
      if (processingFiles.length === 0) {
        clearInterval(interval);
        setPollingInterval(null);
        return;
      }
      
      // Check status for all processing files
      for (const file of processingFiles) {
        if (file.processingJobId) {
          await checkJobStatus(file.id, file.processingJobId);
        }
      }
    }, 3000); // Poll every 3 seconds
    
    setPollingInterval(interval);
  };

  // Cleanup polling on unmount and start polling when needed
  React.useEffect(() => {
    const hasProcessingFiles = selectedFiles.some(f => f.status === 'processing');
    
    if (hasProcessingFiles && !pollingInterval) {
      startPolling();
    }
    
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [selectedFiles, pollingInterval]);

  // Auto-redirect logic for single file uploads
  React.useEffect(() => {
    const completedFiles = selectedFiles.filter(f => f.status === 'completed' && f.materialId);
    const totalFiles = selectedFiles.length;
    
    // Only auto-redirect for single file uploads that are completed
    if (totalFiles === 1 && completedFiles.length === 1 && !redirectCountdown && !redirectTarget) {
      const completedFile = completedFiles[0];
      if (completedFile.materialId) {
        toast.success("Upload and processing complete!", {
          description: "Redirecting to content details..."
        });
        startRedirectCountdown(completedFile.materialId, 3);
      }
    }
  }, [selectedFiles, redirectCountdown, redirectTarget]);

  // Cleanup redirect timer on unmount
  React.useEffect(() => {
    return () => {
      cancelRedirect();
    };
  }, []);

  const handleFilesAdded = (files: File[]) => {
    const newFiles: SelectedFile[] = files.map(file => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      file,
      status: 'pending',
      progress: 0,
      uploadProgress: 0,
      processingProgress: 0
    }));
    
    setSelectedFiles(prev => [...prev, ...newFiles]);
    toast.success(`${files.length} file(s) selected for upload`);
  };

  const removeFile = (fileId: string) => {
    setSelectedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const refreshFileStatus = async (fileId: string, processingJobId: string) => {
    if (processingJobId) {
      await checkJobStatus(fileId, processingJobId);
    }
  };

  const viewContent = (materialId: string) => {
    router.push(`/admin/content/${materialId}`);
  };

  // Auto-redirect functions
  const cancelRedirect = () => {
    if (redirectTimer) {
      clearTimeout(redirectTimer);
      setRedirectTimer(null);
    }
    setRedirectCountdown(null);
    setRedirectTarget(null);
  };

  const startRedirectCountdown = (materialId: string, delaySeconds: number = 3) => {
    setRedirectTarget(materialId);
    setRedirectCountdown(delaySeconds);

    const timer = setTimeout(() => {
      router.push(`/admin/content/${materialId}`);
      toast.success("Redirected to content details");
    }, delaySeconds * 1000);

    setRedirectTimer(timer);

    // Update countdown every second
    const countdownInterval = setInterval(() => {
      setRedirectCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(countdownInterval);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const clearAllFiles = () => {
    setSelectedFiles([]);
    cancelRedirect(); // Cancel any pending redirect
  };

  const handleUploadFiles = async () => {
    if (!selectedCourse || !materialType || !weekNumber || !title) {
      toast.error("Please fill in all required fields before uploading files");
      return;
    }

    if (selectedFiles.length === 0) {
      toast.error("Please select files to upload");
      return;
    }

    setUploading(true);

    try {
      for (const selectedFile of selectedFiles) {
        // Update file status to uploading
        setSelectedFiles(prev => prev.map(f => 
          f.id === selectedFile.id ? { 
            ...f, 
            status: 'uploading', 
            progress: 0, 
            uploadProgress: 0,
            processingProgress: 0
          } : f
        ));

        const formData = new FormData();
        formData.append('file', selectedFile.file);
        formData.append('courseId', selectedCourse);
        formData.append('materialType', materialType);
        formData.append('weekNumber', weekNumber);
        formData.append('title', title);
        formData.append('description', description);

        try {
          const response = await fetch('/api/content/upload', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            throw new Error(`Failed to upload ${selectedFile.file.name}`);
          }

          const result = await response.json();
          
          // Update file to processing status and start SSE tracking
          setSelectedFiles(prev => prev.map(f => 
            f.id === selectedFile.id ? { 
              ...f, 
              status: 'processing', 
              progress: 10, // Upload complete (10%), now processing
              uploadProgress: 100,
              processingProgress: 0,
              processingJobId: result.processingJobId,
              materialId: result.materialId,
              processingPhase: 'Starting AI processing...'
            } : f
          ));
          
          // Polling will automatically start via useEffect when status is 'processing'
          
          toast.success(`${selectedFile.file.name} uploaded and processing started`);
        } catch (error) {
          // Update file status to error
          setSelectedFiles(prev => prev.map(f => 
            f.id === selectedFile.id ? { 
              ...f, 
              status: 'error', 
              error: error instanceof Error ? error.message : 'Upload failed'
            } : f
          ));
          
          toast.error(`Failed to upload ${selectedFile.file.name}`);
        }
      }

      const successfulUploads = selectedFiles.filter(f => f.status === 'completed').length;
      if (successfulUploads > 0) {
        toast.success(`${successfulUploads} file(s) uploaded successfully!`);
      }
      
    } catch (error) {
      console.error('Upload error:', error);
      toast.error("Failed to upload files. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const isFormValid = selectedCourse && materialType && weekNumber && title;
  const canUpload = isFormValid && selectedFiles.length > 0 && !uploading;
  const pendingFiles = selectedFiles.filter(f => f.status === 'pending');
  const uploadingFiles = selectedFiles.filter(f => f.status === 'uploading');
  const processingFiles = selectedFiles.filter(f => f.status === 'processing');
  const completedFiles = selectedFiles.filter(f => f.status === 'completed');
  const errorFiles = selectedFiles.filter(f => f.status === 'error');
  const activeFiles = uploadingFiles.length + processingFiles.length;

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

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
              
              {(activeFiles > 0 || completedFiles.length > 0) && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
                    Processing Pipeline Status
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span>Upload Phase</span>
                      <span className="text-green-600">✓ Complete</span>
                    </div>
                    <div className="flex justify-between">
                      <span>AI Processing</span>
                      <span className={activeFiles > 0 ? 'text-blue-600' : 'text-green-600'}>
                        {activeFiles > 0 ? `${activeFiles} in progress` : '✓ Complete'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Vector Embedding</span>
                      <span className={activeFiles > 0 ? 'text-gray-500' : 'text-green-600'}>
                        {activeFiles > 0 ? 'Pending' : '✓ Complete'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Knowledge Base</span>
                      <span className={completedFiles.length > 0 ? 'text-green-600' : 'text-gray-500'}>
                        {completedFiles.length > 0 ? `${completedFiles.length} files ready` : 'Pending'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Auto-redirect notification */}
              {redirectCountdown !== null && redirectTarget && (
                <div className="mt-4 p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-green-800 dark:text-green-200">
                          Processing Complete!
                        </h4>
                        <p className="text-xs text-green-700 dark:text-green-300">
                          Redirecting to content details in {redirectCountdown} seconds...
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => viewContent(redirectTarget)}
                        className="text-green-700 border-green-300 hover:bg-green-100"
                      >
                        Go Now
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={cancelRedirect}
                        className="text-green-700 hover:bg-green-100"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2 w-full bg-green-200 dark:bg-green-800 rounded-full h-1">
                    <div 
                      className="bg-green-500 h-1 rounded-full transition-all duration-1000"
                      style={{ width: `${((3 - (redirectCountdown || 0)) / 3) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* File Upload Area */}
        <div className="lg:col-span-2 space-y-4">
          <FileUploadZone
            onFilesSelected={handleFilesAdded}
            disabled={!isFormValid}
          />

          {/* Selected Files Preview */}
          {selectedFiles.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Selected Files ({selectedFiles.length})
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={clearAllFiles}>
                    Clear All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {selectedFiles.map((selectedFile) => {
                    const { file, status, progress, error, processingPhase } = selectedFile;
                    const phaseDetails = getProcessingPhaseDetails(processingPhase || '', file.type);
                    const estimatedTime = getEstimatedTime(file.type, file.size);
                    const PhaseIcon = phaseDetails.icon;
                    return (
                      <div key={selectedFile.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                        <FileText className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(file.size)} • {file.type}
                          </p>
                          {(status === 'uploading' || status === 'processing') && (
                            <div className="mt-2">
                              <div className="flex justify-between items-center text-xs mb-1">
                                <div className="flex items-center gap-1">
                                  {status === 'processing' && (
                                    <PhaseIcon className={`h-3 w-3 ${phaseDetails.color} animate-pulse`} />
                                  )}
                                  <span className={status === 'processing' ? phaseDetails.color : ''}>
                                    {status === 'uploading' ? 'Uploading to cloud...' : 
                                     status === 'processing' ? phaseDetails.label :
                                     'Processing...'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {status === 'processing' && (
                                    <span className="text-muted-foreground">ETA: {estimatedTime}</span>
                                  )}
                                  <span className="font-medium">{Math.round(progress)}%</span>
                                </div>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-1.5">
                                <div 
                                  className={`h-1.5 rounded-full transition-all duration-300 ${
                                    status === 'uploading' ? 'bg-blue-600' : 'bg-green-600'
                                  }`}
                                  style={{ width: `${progress}%` }}
                                ></div>
                              </div>
                              {status === 'processing' && (
                                <div className="flex justify-between text-xs mt-1 text-muted-foreground">
                                  <span>✓ Upload Complete</span>
                                  <span>AI Analysis: {Math.round(selectedFile.processingProgress)}%</span>
                                </div>
                              )}
                            </div>
                          )}
                          {error && (
                            <p className="text-xs text-destructive mt-1">{error}</p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          {status === 'pending' && (
                            <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                          )}
                          {status === 'uploading' && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                          )}
                          {status === 'processing' && (
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                          )}
                          {status === 'completed' && (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          )}
                          {status === 'error' && (
                            <AlertCircle className="h-4 w-4 text-destructive" />
                          )}
                          {status === 'completed' && selectedFile.materialId && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => viewContent(selectedFile.materialId!)}
                              className="h-6 px-2 text-xs"
                            >
                              View
                            </Button>
                          )}
                          {status === 'processing' && selectedFile.processingJobId && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => refreshFileStatus(selectedFile.id, selectedFile.processingJobId!)}
                              className="h-6 w-6"
                              title="Refresh status"
                            >
                              <Settings className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeFile(selectedFile.id)}
                            className="h-6 w-6"
                            disabled={status === 'uploading' || status === 'processing'}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Upload Button */}
          {selectedFiles.length > 0 && (
            <Card className="border-green-200 dark:border-green-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Upload className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-green-700 dark:text-green-300">
                        Ready to upload {pendingFiles.length} file(s)
                      </p>
                      {activeFiles > 0 && (
                        <p className="text-xs text-blue-600/80 dark:text-blue-400/80">
                          {uploadingFiles.length} uploading, {processingFiles.length} processing
                        </p>
                      )}
                      {completedFiles.length > 0 && (
                        <p className="text-xs text-green-600/80 dark:text-green-400/80">
                          {completedFiles.length} file(s) completed processing
                        </p>
                      )}
                      {errorFiles.length > 0 && (
                        <p className="text-xs text-red-600/80 dark:text-red-400/80">
                          {errorFiles.length} file(s) failed
                        </p>
                      )}
                    </div>
                  </div>
                  <Button 
                    onClick={handleUploadFiles}
                    disabled={!canUpload}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {uploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Files
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Multi-file completion section */}
          {selectedFiles.length > 1 && completedFiles.length > 0 && completedFiles.length === selectedFiles.length && (
            <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-green-800 dark:text-green-200">
                        All Files Processed Successfully!
                      </p>
                      <p className="text-xs text-green-700 dark:text-green-300">
                        {completedFiles.length} files are ready and available in your content library.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push('/admin/content/manage')}
                      className="text-green-700 border-green-300 hover:bg-green-100"
                    >
                      View All Uploads
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Form Validation Message */}
          {!isFormValid && (
            <Card className="border-amber-200 dark:border-amber-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <Upload className="h-4 w-4" />
                  <div>
                    <p className="text-sm font-medium mb-1">
                      Complete the form to enable file selection
                    </p>
                    <p className="text-xs text-amber-600/80 dark:text-amber-400/80">
                      All fields marked with * are required before you can select files for upload.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}