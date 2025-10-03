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
  Share
} from "lucide-react";
import { getSession } from "@/lib/auth/server";
import { requireAdmin } from "@/lib/auth/admin";

export default async function ReportsManagePage() {
  const session = await getSession();
  const adminAccess = await requireAdmin();

  if (adminAccess instanceof Response) {
    return <div>Access denied. Admin privileges required.</div>;
  }

  // Mock reports data (in real app, this would come from database)
  const reports = [
    {
      id: "1",
      name: "Student Enrollment Summary",
      description: "Comprehensive overview of student enrollment across all departments and programs",
      category: "enrollment",
      type: "automated",
      format: "pdf",
      schedule: "weekly",
      lastGenerated: "2024-03-20T08:00:00Z",
      nextScheduled: "2024-03-27T08:00:00Z",
      status: "active",
      createdBy: "System",
      downloads: 23,
      size: "2.4 MB",
      recipients: ["admin@miva.edu.ng", "registrar@miva.edu.ng"]
    },
    {
      id: "2",
      name: "Faculty Performance Dashboard",
      description: "Teaching effectiveness metrics, course evaluations, and research activities",
      category: "performance",
      type: "automated",
      format: "excel",
      schedule: "monthly",
      lastGenerated: "2024-03-01T09:00:00Z",
      nextScheduled: "2024-04-01T09:00:00Z",
      status: "active",
      createdBy: "HR Department",
      downloads: 15,
      size: "5.1 MB",
      recipients: ["hr@miva.edu.ng", "dean@miva.edu.ng"]
    },
    {
      id: "3",
      name: "Course Completion Rates by Department",
      description: "Analysis of course completion rates, dropout patterns, and academic success metrics",
      category: "academic",
      type: "custom",
      format: "pdf",
      schedule: "semester",
      lastGenerated: "2024-02-15T14:30:00Z",
      nextScheduled: "2024-06-15T14:30:00Z",
      status: "active",
      createdBy: "Dr. Sarah Johnson",
      downloads: 8,
      size: "3.7 MB",
      recipients: ["academic.affairs@miva.edu.ng"]
    },
    {
      id: "4",
      name: "System Usage Analytics",
      description: "Platform engagement metrics, user activity patterns, and feature utilization",
      category: "system",
      type: "automated",
      format: "excel",
      schedule: "daily",
      lastGenerated: "2024-03-21T06:00:00Z",
      nextScheduled: "2024-03-22T06:00:00Z",
      status: "active",
      createdBy: "IT Services",
      downloads: 45,
      size: "1.8 MB",
      recipients: ["it@miva.edu.ng", "admin@miva.edu.ng"]
    },
    {
      id: "5",
      name: "Grade Distribution Analysis",
      description: "Statistical analysis of grade distributions across courses and departments",
      category: "academic",
      type: "custom",
      format: "pdf",
      schedule: "manual",
      lastGenerated: "2024-03-10T11:15:00Z",
      nextScheduled: null,
      status: "paused",
      createdBy: "Prof. Michael Chen",
      downloads: 12,
      size: "4.2 MB",
      recipients: ["academic.committee@miva.edu.ng"]
    },
    {
      id: "6",
      name: "Financial Aid Disbursement Report",
      description: "Summary of financial aid applications, approvals, and disbursements",
      category: "financial",
      type: "automated",
      format: "excel",
      schedule: "monthly",
      lastGenerated: "2024-03-01T10:00:00Z",
      nextScheduled: "2024-04-01T10:00:00Z",
      status: "active",
      createdBy: "Financial Aid Office",
      downloads: 6,
      size: "2.9 MB",
      recipients: ["finaid@miva.edu.ng", "bursar@miva.edu.ng"]
    },
    {
      id: "7",
      name: "Alumni Engagement Metrics",
      description: "Alumni participation rates, event attendance, and donation tracking",
      category: "engagement",
      type: "custom",
      format: "pdf",
      schedule: "quarterly",
      lastGenerated: "2024-01-15T16:00:00Z",
      nextScheduled: "2024-04-15T16:00:00Z",
      status: "active",
      createdBy: "Alumni Relations",
      downloads: 4,
      size: "1.5 MB",
      recipients: ["alumni@miva.edu.ng"]
    },
    {
      id: "8",
      name: "Research Publications Summary",
      description: "Faculty research output, publication metrics, and grant funding status",
      category: "research",
      type: "custom",
      format: "pdf",
      schedule: "semester",
      lastGenerated: "2024-02-20T13:45:00Z",
      nextScheduled: "2024-06-20T13:45:00Z",
      status: "draft",
      createdBy: "Research Office",
      downloads: 0,
      size: "0 MB",
      recipients: ["research@miva.edu.ng", "dean@miva.edu.ng"]
    }
  ];

  const reportCategories = [
    { name: "Academic Reports", icon: BookOpen, color: "bg-blue-100 text-blue-800", count: 2 },
    { name: "Enrollment Reports", icon: Users, color: "bg-green-100 text-green-800", count: 1 },
    { name: "Performance Reports", icon: TrendingUp, color: "bg-purple-100 text-purple-800", count: 1 },
    { name: "System Reports", icon: Activity, color: "bg-orange-100 text-orange-800", count: 1 },
    { name: "Financial Reports", icon: DollarSign, color: "bg-yellow-100 text-yellow-800", count: 1 },
    { name: "Research Reports", icon: Award, color: "bg-indigo-100 text-indigo-800", count: 1 },
    { name: "Engagement Reports", icon: Target, color: "bg-pink-100 text-pink-800", count: 1 }
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
                <Input placeholder="Search reports by name, category, or creator..." className="pl-10" />
              </div>
            </div>
            <Select>
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
            <Select>
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
            <Select>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="automated">Automated</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
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
        </CardContent>
      </Card>
    </div>
  );
}