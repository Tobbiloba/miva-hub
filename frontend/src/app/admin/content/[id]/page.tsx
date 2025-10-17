"use client";
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Download, 
  FileText, 
  Calendar, 
  User, 
  Database,
  CheckCircle,
  Clock,
  AlertCircle,
  Brain,
  Zap
} from "lucide-react";
import Link from "next/link";

interface CourseMaterial {
  id: string;
  courseId: string;
  materialType: string;
  title: string;
  description: string;
  contentUrl: string;
  publicUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  weekNumber: number;
  moduleNumber: number;
  isPublic: boolean;
  uploadedById: string;
  createdAt: string;
  updatedAt: string;
}

interface ProcessingJob {
  id: string;
  courseMaterialId: string;
  jobType: string;
  status: string;
  startedAt: string;
  completedAt: string;
  errorMessage: string;
  metadata: any;
  createdAt: string;
}

export default function ContentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const materialId = params.id as string;

  const [material, setMaterial] = useState<CourseMaterial | null>(null);
  const [processingJobs, setProcessingJobs] = useState<ProcessingJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMaterialData();
    fetchProcessingJobs();
  }, [materialId]);

  const fetchMaterialData = async () => {
    try {
      const response = await fetch(`/api/admin/course-materials/${materialId}`);
      const data = await response.json();
      
      if (data.success) {
        setMaterial(data.data);
      } else {
        setError(data.message || "Failed to fetch material");
      }
    } catch (err) {
      setError("Failed to fetch material data");
      console.error("Error fetching material:", err);
    }
  };

  const fetchProcessingJobs = async () => {
    try {
      const response = await fetch(`/api/content/processing-jobs?limit=50`);
      const data = await response.json();
      
      if (data.jobs) {
        // Filter jobs for this material
        const materialJobs = data.jobs.filter(
          (job: any) => job.courseMaterialId === materialId
        );
        setProcessingJobs(materialJobs);
      }
    } catch (err) {
      console.error("Error fetching processing jobs:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { variant: "default" as const, icon: CheckCircle, color: "text-green-600" },
      processing: { variant: "secondary" as const, icon: Clock, color: "text-blue-600" },
      pending: { variant: "outline" as const, icon: Clock, color: "text-yellow-600" },
      failed: { variant: "destructive" as const, icon: AlertCircle, color: "text-red-600" }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className={`h-3 w-3 ${config.color}`} />
        {status}
      </Badge>
    );
  };

  const handleDownload = async () => {
    if (!material?.publicUrl) {
      toast.error("Download not available");
      return;
    }

    try {
      const response = await fetch(material.publicUrl);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = material.fileName || 'download';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success("Download started");
      } else {
        toast.error("Download failed");
      }
    } catch (error) {
      toast.error("Download failed");
      console.error("Download error:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !material) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/admin/content/manage">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Content Not Found</h1>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <p>{error || "Content not found"}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/admin/content/manage">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{material.title}</h1>
          <p className="text-muted-foreground">Content Details</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Material Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Type</p>
                  <Badge variant="outline">{material.materialType}</Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Week</p>
                  <p className="font-medium">Week {material.weekNumber}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">File Name</p>
                  <p className="font-medium">{material.fileName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">File Size</p>
                  <p className="font-medium">{formatFileSize(material.fileSize)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Format</p>
                  <p className="font-medium">{material.mimeType}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Visibility</p>
                  <Badge variant={material.isPublic ? "default" : "secondary"}>
                    {material.isPublic ? "Public" : "Private"}
                  </Badge>
                </div>
              </div>
              
              {material.description && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Description</p>
                  <p className="text-sm">{material.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Processing Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                AI Processing Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {processingJobs.length > 0 ? (
                <div className="space-y-3">
                  {processingJobs.map((job) => (
                    <div key={job.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Zap className="h-4 w-4 text-blue-500" />
                        <div>
                          <p className="font-medium">{job.jobType.replace('_', ' ')}</p>
                          <p className="text-sm text-muted-foreground">
                            Created {formatDate(job.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {getStatusBadge(job.status)}
                        {job.completedAt && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Completed {formatDate(job.completedAt)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No processing jobs found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                onClick={handleDownload} 
                className="w-full"
                disabled={!material.publicUrl}
              >
                <Download className="h-4 w-4 mr-2" />
                Download File
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <Link href={`/admin/content/manage`}>
                  <FileText className="h-4 w-4 mr-2" />
                  Manage Content
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Metadata
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Material ID</p>
                <p className="text-xs font-mono bg-muted p-2 rounded">{material.id}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Course ID</p>
                <p className="text-xs font-mono bg-muted p-2 rounded">{material.courseId}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Uploaded</p>
                <p className="text-sm">{formatDate(material.createdAt)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
                <p className="text-sm">{formatDate(material.updatedAt)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}