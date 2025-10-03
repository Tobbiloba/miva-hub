"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Filter,
  Download,
  RefreshCw,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  MoreHorizontal,
  Activity,
  Zap,
  FileText,
  Video,
  FileIcon,
  Brain,
} from "lucide-react";

interface ProcessingJob {
  id: string;
  courseMaterialId: string;
  jobType: "pdf_processing" | "video_transcription" | "interactive_parsing" | "text_analysis";
  status: "pending" | "processing" | "completed" | "failed";
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
  metadata: any;
  createdAt: string;
  material: {
    title: string;
    type: string;
    fileName: string;
    courseId: string;
  };
}

interface ProcessingJobsResponse {
  jobs: ProcessingJob[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  statistics: {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
}

export default function ProcessingDashboardPage() {
  const [jobs, setJobs] = useState<ProcessingJob[]>([]);
  const [statistics, setStatistics] = useState({
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [refreshing, setRefreshing] = useState(false);

  const fetchProcessingJobs = async (status = statusFilter) => {
    try {
      setRefreshing(true);
      const response = await fetch(`/api/content/processing-jobs?status=${status}&limit=100`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch processing jobs: ${response.statusText}`);
      }

      const data: ProcessingJobsResponse = await response.json();
      setJobs(data.jobs);
      setStatistics(data.statistics);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch processing jobs');
      console.error('Error fetching processing jobs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProcessingJobs();
    
    // Auto-refresh every 30 seconds for active jobs
    const interval = setInterval(() => {
      if (statistics.pending > 0 || statistics.processing > 0) {
        fetchProcessingJobs();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [statusFilter, statistics.pending, statistics.processing]);

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    setLoading(true);
    fetchProcessingJobs(status);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800 border-green-200";
      case "processing": return "bg-blue-100 text-blue-800 border-blue-200";
      case "pending": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "failed": return "bg-red-100 text-red-800 border-red-200";
      default: return "";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return CheckCircle;
      case "processing": return Activity;
      case "pending": return Clock;
      case "failed": return XCircle;
      default: return AlertCircle;
    }
  };

  const getJobTypeIcon = (jobType: string) => {
    switch (jobType) {
      case "pdf_processing": return FileText;
      case "video_transcription": return Video;
      case "interactive_parsing": return FileIcon;
      case "text_analysis": return Brain;
      default: return FileIcon;
    }
  };

  const formatDuration = (startedAt?: string, completedAt?: string) => {
    if (!startedAt) return "Not started";
    
    const start = new Date(startedAt);
    const end = completedAt ? new Date(completedAt) : new Date();
    const durationMs = end.getTime() - start.getTime();
    const durationSec = Math.floor(durationMs / 1000);
    
    if (durationSec < 60) return `${durationSec}s`;
    const durationMin = Math.floor(durationSec / 60);
    if (durationMin < 60) return `${durationMin}m ${durationSec % 60}s`;
    const durationHour = Math.floor(durationMin / 60);
    return `${durationHour}h ${durationMin % 60}m`;
  };

  if (error) {
    return (
      <div className="space-y-6 p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Error Loading Processing Jobs</h1>
          <p className="text-gray-600 mt-2">{error}</p>
          <Button onClick={() => fetchProcessingJobs()} className="mt-4">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Zap className="h-8 w-8 text-blue-600" />
            AI Processing Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor AI content processing jobs and their status
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => fetchProcessingJobs()}
            disabled={refreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{statistics.total}</p>
                <p className="text-xs text-muted-foreground">Total Jobs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold">{statistics.pending}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{statistics.processing}</p>
                <p className="text-xs text-muted-foreground">Processing</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{statistics.completed}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-2xl font-bold">{statistics.failed}</p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Section */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by job ID, material title, or course..." className="pl-10" />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Processing Jobs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Processing Jobs</CardTitle>
          <CardDescription>
            AI content processing jobs and their current status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <Activity className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p>Loading processing jobs...</p>
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-8">
              <Zap className="h-8 w-8 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">No processing jobs found</p>
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job) => {
                    const StatusIcon = getStatusIcon(job.status);
                    const JobTypeIcon = getJobTypeIcon(job.jobType);
                    
                    return (
                      <TableRow key={job.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                              <JobTypeIcon className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{job.id.slice(0, 8)}...</p>
                              <p className="text-xs text-muted-foreground">
                                {job.jobType.replace('_', ' ')}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm line-clamp-1">{job.material.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {job.material.fileName}
                            </p>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <Badge variant="outline">
                            {job.jobType.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <StatusIcon className="h-4 w-4" />
                            <Badge variant="outline" className={getStatusColor(job.status)}>
                              {job.status}
                            </Badge>
                          </div>
                          {job.errorMessage && (
                            <p className="text-xs text-red-600 mt-1 line-clamp-1">
                              {job.errorMessage}
                            </p>
                          )}
                        </TableCell>
                        
                        <TableCell>
                          <div className="text-sm">
                            {formatDuration(job.startedAt, job.completedAt)}
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="text-sm">
                            {new Date(job.createdAt).toLocaleDateString()}
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              {job.status === "completed" && (
                                <DropdownMenuItem>
                                  <Download className="mr-2 h-4 w-4" />
                                  Download Results
                                </DropdownMenuItem>
                              )}
                              {job.status === "failed" && (
                                <DropdownMenuItem>
                                  <RefreshCw className="mr-2 h-4 w-4" />
                                  Retry Processing
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}