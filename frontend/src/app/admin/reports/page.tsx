"use client";
import React, { useState, useEffect } from "react";
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
  FileText,
  Search,
  Filter,
  Download,
  Plus,
  Play,
  Pause,
  Edit,
  Trash2,
  Eye,
  Calendar,
  Clock,
  MoreHorizontal,
  TrendingUp,
  Users,
  BookOpen,
  GraduationCap,
  Building2,
  BarChart3,
  PieChart,
  Activity,
  Award,
  Target,
  DollarSign,
  FileSpreadsheet,
  Mail,
  Share,
  Loader2,
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";

interface Report {
  id: string;
  name: string;
  description: string;
  category: string;
  type: string;
  format: string;
  schedule: string;
  status: string;
  createdBy: string;
  lastGenerated: string | null;
  nextScheduled: string | null;
  downloads: number;
  size: string;
  recipients: string[];
  generationCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function ReportsManagePage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Build query parameters
      const params = new URLSearchParams();
      if (debouncedSearchTerm) params.append('search', debouncedSearchTerm);
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (typeFilter !== 'all') params.append('reportType', typeFilter);
      
      const response = await fetch(`/api/admin/reports?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch reports');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setReports(data.data);
      } else {
        throw new Error(data.message || 'Failed to fetch reports');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    fetchReports();
  }, [debouncedSearchTerm, categoryFilter, statusFilter, typeFilter]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  const handleCategoryFilter = (value: string) => {
    setCategoryFilter(value);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
  };

  const handleTypeFilter = (value: string) => {
    setTypeFilter(value);
  };

  // Calculate dynamic report categories based on actual data
  const reportCategories = [
    { name: "Academic Reports", icon: BookOpen, color: "bg-blue-100 text-blue-800", count: reports.filter(r => r.category === 'academic').length },
    { name: "Enrollment Reports", icon: Users, color: "bg-green-100 text-green-800", count: reports.filter(r => r.category === 'enrollment').length },
    { name: "Performance Reports", icon: TrendingUp, color: "bg-purple-100 text-purple-800", count: reports.filter(r => r.category === 'performance').length },
    { name: "System Reports", icon: Activity, color: "bg-orange-100 text-orange-800", count: reports.filter(r => r.category === 'system').length },
    { name: "Financial Reports", icon: DollarSign, color: "bg-yellow-100 text-yellow-800", count: reports.filter(r => r.category === 'financial').length },
    { name: "Research Reports", icon: Award, color: "bg-indigo-100 text-indigo-800", count: reports.filter(r => r.category === 'research').length },
    { name: "Engagement Reports", icon: Target, color: "bg-pink-100 text-pink-800", count: reports.filter(r => r.category === 'engagement').length }
  ];

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "academic": return "bg-blue-100 text-blue-800";
      case "enrollment": return "bg-green-100 text-green-800";
      case "performance": return "bg-purple-100 text-purple-800";
      case "system": return "bg-orange-100 text-orange-800";
      case "financial": return "bg-yellow-100 text-yellow-800";
      case "research": return "bg-indigo-100 text-indigo-800";
      case "engagement": return "bg-pink-100 text-pink-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800 border-green-200";
      case "paused": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "draft": return "bg-gray-100 text-gray-800 border-gray-200";
      case "error": return "bg-red-100 text-red-800 border-red-200";
      default: return "";
    }
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case "pdf": return FileText;
      case "excel": return FileSpreadsheet;
      case "csv": return FileSpreadsheet;
      default: return FileText;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getScheduleColor = (schedule: string) => {
    switch (schedule) {
      case "daily": return "text-green-600";
      case "weekly": return "text-blue-600";
      case "monthly": return "text-purple-600";
      case "quarterly": return "text-orange-600";
      case "semester": return "text-indigo-600";
      case "manual": return "text-gray-600";
      default: return "text-gray-600";
    }
  };

  // Calculate statistics
  const totalReports = reports.length;
  const activeReports = reports.filter(r => r.status === 'active').length;
  const automatedReports = reports.filter(r => r.type === 'automated').length;
  const totalDownloads = reports.reduce((sum, report) => sum + report.downloads, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading reports...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Error Loading Reports</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchReports} variant="outline">
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
            <BarChart3 className="h-8 w-8 text-blue-600" />
            Reports Center
          </h1>
          <p className="text-muted-foreground mt-1">
            Generate, schedule, and manage institutional reports and analytics
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export All
          </Button>
          <Button asChild>
            <a href="/admin/reports/create">
              <Plus className="mr-2 h-4 w-4" />
              Create Report
            </a>
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{totalReports}</p>
                <p className="text-xs text-muted-foreground">Total Reports</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{activeReports}</p>
                <p className="text-xs text-muted-foreground">Active Reports</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{automatedReports}</p>
                <p className="text-xs text-muted-foreground">Automated</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">{totalDownloads}</p>
                <p className="text-xs text-muted-foreground">Total Downloads</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Report Categories</CardTitle>
          <CardDescription>
            Browse reports by category
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-7">
            {reportCategories.map((category) => (
              <Card key={category.name} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className={`w-12 h-12 rounded-lg ${category.color} flex items-center justify-center`}>
                      <category.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{category.name}</p>
                      <p className="text-xs text-muted-foreground">{category.count} reports</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Search and Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search reports by name, category, or creator..." 
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
            </div>
            <Select value={categoryFilter} onValueChange={handleCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="academic">Academic</SelectItem>
                <SelectItem value="enrollment">Enrollment</SelectItem>
                <SelectItem value="performance">Performance</SelectItem>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="financial">Financial</SelectItem>
                <SelectItem value="research">Research</SelectItem>
                <SelectItem value="engagement">Engagement</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={handleStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={handleTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="automated">Automated</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" disabled={loading}>
              <Filter className="mr-2 h-4 w-4" />
              More Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reports Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Reports</CardTitle>
          <CardDescription>
            Manage all system reports and their schedules
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Reports Found</h3>
                <p className="text-muted-foreground mb-4">
                  {debouncedSearchTerm || categoryFilter !== 'all' || statusFilter !== 'all' || typeFilter !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'Create your first report to get started'
                  }
                </p>
                <Button asChild>
                  <a href="/admin/reports/create">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Report
                  </a>
                </Button>
              </div>
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Report</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead>Last Generated</TableHead>
                    <TableHead>Downloads</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => {
                  const FormatIcon = getFormatIcon(report.format);
                  return (
                    <TableRow key={report.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                            <FormatIcon className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium line-clamp-1">{report.name}</p>
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {report.description}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              <span>By {report.createdBy}</span>
                              <span>•</span>
                              <span>{report.format.toUpperCase()}</span>
                              <span>•</span>
                              <span>{report.size}</span>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <Badge variant="secondary" className={getCategoryColor(report.category)}>
                          {report.category}
                        </Badge>
                        <div className="text-xs text-muted-foreground mt-1">
                          {report.type}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(report.status)}>
                          {report.status}
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        <div className="space-y-1">
                          <div className={`text-sm font-medium ${getScheduleColor(report.schedule)}`}>
                            {report.schedule}
                          </div>
                          {report.nextScheduled && (
                            <div className="text-xs text-muted-foreground">
                              Next: {formatDate(report.nextScheduled)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="space-y-1">
                          {report.lastGenerated && (
                            <div className="text-sm">
                              {formatDate(report.lastGenerated)}
                            </div>
                          )}
                          {report.recipients.length > 0 && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              <span>{report.recipients.length} recipients</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Download className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{report.downloads}</span>
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
                              View Report
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Download className="mr-2 h-4 w-4" />
                              Download Latest
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Play className="mr-2 h-4 w-4" />
                              Generate Now
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Share className="mr-2 h-4 w-4" />
                              Share Report
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Settings
                            </DropdownMenuItem>
                            {report.status === 'active' ? (
                              <DropdownMenuItem className="text-yellow-600">
                                <Pause className="mr-2 h-4 w-4" />
                                Pause Schedule
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem className="text-green-600">
                                <Play className="mr-2 h-4 w-4" />
                                Resume Schedule
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Report
                            </DropdownMenuItem>
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