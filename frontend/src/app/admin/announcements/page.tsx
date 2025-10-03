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
  Megaphone,
  Search,
  Filter,
  Download,
  Plus,
  Edit,
  Trash2,
  Eye,
  Send,
  Clock,
  MoreHorizontal,
  Calendar,
  Users,
  AlertTriangle,
  CheckCircle,
  Bell,
  Pin,
  Globe,
  BookOpen,
  GraduationCap,
  Building2,
  Target
} from "lucide-react";
import { getSession } from "@/lib/auth/server";
import { requireAdmin } from "@/lib/auth/admin";

export default async function AnnouncementsManagePage() {
  const session = await getSession();
  const adminAccess = await requireAdmin();

  if (adminAccess instanceof Response) {
    return <div>Access denied. Admin privileges required.</div>;
  }

  // Mock announcements data (in real app, this would come from database)
  const announcements = [
    {
      id: "1",
      title: "Fall 2024 Final Exam Schedule Released",
      content: "The final examination schedule for Fall 2024 semester is now available. Please check your student portal for specific exam times and locations.",
      author: "Academic Office",
      audience: "students",
      department: "all",
      priority: "high",
      status: "published",
      publishedAt: "2024-03-20T08:00:00Z",
      scheduledFor: null,
      readCount: 342,
      totalTargeted: 450,
      isPinned: true,
      expiresAt: "2024-12-31T23:59:59Z",
      courses: [],
      attachments: ["fall_2024_exam_schedule.pdf"]
    },
    {
      id: "2",
      title: "Faculty Development Workshop - March 25",
      content: "Join us for a professional development workshop on modern teaching methodologies. Registration is required by March 23rd.",
      author: "HR Department",
      audience: "faculty",
      department: "all",
      priority: "medium",
      status: "published",
      publishedAt: "2024-03-18T10:00:00Z",
      scheduledFor: null,
      readCount: 28,
      totalTargeted: 45,
      isPinned: false,
      expiresAt: "2024-03-26T23:59:59Z",
      courses: [],
      attachments: []
    },
    {
      id: "3",
      title: "Spring 2025 Course Registration Opens April 1st",
      content: "Course registration for Spring 2025 will begin on April 1st at 8:00 AM. Please review the course catalog and meet with your academic advisor before registration.",
      author: "Registrar Office",
      audience: "students",
      department: "all",
      priority: "high",
      status: "scheduled",
      publishedAt: null,
      scheduledFor: "2024-03-30T08:00:00Z",
      readCount: 0,
      totalTargeted: 450,
      isPinned: false,
      expiresAt: "2024-04-15T23:59:59Z",
      courses: [],
      attachments: ["spring_2025_course_catalog.pdf"]
    },
    {
      id: "4",
      title: "CS Department: Database Systems Project Deadline Extension",
      content: "Due to technical difficulties with the lab servers, the Database Systems final project deadline has been extended by one week.",
      author: "Prof. Michael Chen",
      audience: "students",
      department: "computer-science",
      priority: "medium",
      status: "published",
      publishedAt: "2024-03-19T14:30:00Z",
      scheduledFor: null,
      readCount: 32,
      totalTargeted: 35,
      isPinned: false,
      expiresAt: "2024-04-30T23:59:59Z",
      courses: ["CS301"],
      attachments: []
    },
    {
      id: "5",
      title: "Campus Wi-Fi Maintenance - March 22",
      content: "The campus Wi-Fi network will undergo scheduled maintenance on March 22nd from 2:00 AM to 6:00 AM. Internet services may be intermittent during this time.",
      author: "IT Services",
      audience: "all",
      department: "all",
      priority: "medium",
      status: "published",
      publishedAt: "2024-03-17T16:00:00Z",
      scheduledFor: null,
      readCount: 523,
      totalTargeted: 650,
      isPinned: true,
      expiresAt: "2024-03-23T06:00:00Z",
      courses: [],
      attachments: []
    },
    {
      id: "6",
      title: "Graduation Ceremony Information",
      content: "Important details about the upcoming graduation ceremony including dress code, seating arrangements, and ticket distribution.",
      author: "Academic Office",
      audience: "students",
      department: "all",
      priority: "high",
      status: "draft",
      publishedAt: null,
      scheduledFor: null,
      readCount: 0,
      totalTargeted: 0,
      isPinned: false,
      expiresAt: "2024-12-25T23:59:59Z",
      courses: [],
      attachments: []
    },
    {
      id: "7",
      title: "Mathematics Department Seminar Series",
      content: "Join us for weekly seminars featuring guest speakers from industry and academia. All mathematics students and faculty are welcome.",
      author: "Prof. David Wilson",
      audience: "all",
      department: "mathematics",
      priority: "low",
      status: "published",
      publishedAt: "2024-03-15T09:00:00Z",
      scheduledFor: null,
      readCount: 67,
      totalTargeted: 85,
      isPinned: false,
      expiresAt: "2024-06-30T23:59:59Z",
      courses: [],
      attachments: ["seminar_schedule.pdf"]
    }
  ];

  const getAudienceColor = (audience: string) => {
    switch (audience) {
      case "students": return "bg-blue-100 text-blue-800";
      case "faculty": return "bg-green-100 text-green-800";
      case "all": return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-800 border-red-200";
      case "medium": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low": return "bg-green-100 text-green-800 border-green-200";
      default: return "";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published": return "bg-green-100 text-green-800";
      case "scheduled": return "bg-blue-100 text-blue-800";
      case "draft": return "bg-gray-100 text-gray-800";
      case "expired": return "bg-red-100 text-red-800";
      default: return "";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "published": return CheckCircle;
      case "scheduled": return Clock;
      case "draft": return Edit;
      case "expired": return AlertTriangle;
      default: return Bell;
    }
  };

  const getAudienceIcon = (audience: string) => {
    switch (audience) {
      case "students": return GraduationCap;
      case "faculty": return BookOpen;
      case "all": return Globe;
      default: return Users;
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

  const getReadPercentage = (readCount: number, totalTargeted: number) => {
    if (totalTargeted === 0) return 0;
    return Math.round((readCount / totalTargeted) * 100);
  };

  // Calculate statistics
  const totalAnnouncements = announcements.length;
  const publishedCount = announcements.filter(a => a.status === 'published').length;
  const scheduledCount = announcements.filter(a => a.status === 'scheduled').length;
  const pinnedCount = announcements.filter(a => a.isPinned).length;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Megaphone className="h-8 w-8 text-blue-600" />
            Announcements Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Create and manage announcements for students, faculty, and staff
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export List
          </Button>
          <Button asChild>
            <a href="/admin/announcements/create">
              <Plus className="mr-2 h-4 w-4" />
              Create Announcement
            </a>
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{totalAnnouncements}</p>
                <p className="text-xs text-muted-foreground">Total Announcements</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{publishedCount}</p>
                <p className="text-xs text-muted-foreground">Published</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold">{scheduledCount}</p>
                <p className="text-xs text-muted-foreground">Scheduled</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Pin className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{pinnedCount}</p>
                <p className="text-xs text-muted-foreground">Pinned</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search announcements by title, content, or author..." className="pl-10" />
              </div>
            </div>
            <Select>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Audience" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Audiences</SelectItem>
                <SelectItem value="students">Students</SelectItem>
                <SelectItem value="faculty">Faculty</SelectItem>
                <SelectItem value="all-users">All Users</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="high">High Priority</SelectItem>
                <SelectItem value="medium">Medium Priority</SelectItem>
                <SelectItem value="low">Low Priority</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              More Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Announcements Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Announcements</CardTitle>
          <CardDescription>
            Manage all system announcements and notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Announcement</TableHead>
                  <TableHead>Audience</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Engagement</TableHead>
                  <TableHead>Timing</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {announcements.map((announcement) => {
                  const StatusIcon = getStatusIcon(announcement.status);
                  const AudienceIcon = getAudienceIcon(announcement.audience);
                  const readPercentage = getReadPercentage(announcement.readCount, announcement.totalTargeted);
                  
                  return (
                    <TableRow key={announcement.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                            <Megaphone className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium line-clamp-1">{announcement.title}</p>
                              {announcement.isPinned && (
                                <Pin className="h-3 w-3 text-orange-500" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {announcement.content}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              <span>By {announcement.author}</span>
                              {announcement.attachments.length > 0 && (
                                <>
                                  <span>•</span>
                                  <span>{announcement.attachments.length} attachment(s)</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <AudienceIcon className="h-4 w-4 text-muted-foreground" />
                            <Badge variant="secondary" className={getAudienceColor(announcement.audience)}>
                              {announcement.audience}
                            </Badge>
                          </div>
                          {announcement.department !== 'all' && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Building2 className="h-3 w-3" />
                              <span>{announcement.department}</span>
                            </div>
                          )}
                          {announcement.courses.length > 0 && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <BookOpen className="h-3 w-3" />
                              <span>{announcement.courses.join(', ')}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <Badge variant="outline" className={getPriorityColor(announcement.priority)}>
                          {announcement.priority}
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <StatusIcon className="h-4 w-4 text-muted-foreground" />
                          <Badge variant="secondary" className={getStatusColor(announcement.status)}>
                            {announcement.status}
                          </Badge>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="space-y-1">
                          {announcement.status === 'published' ? (
                            <>
                              <div className="flex items-center gap-2">
                                <Eye className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">
                                  {announcement.readCount}/{announcement.totalTargeted}
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {readPercentage}% read rate
                              </div>
                            </>
                          ) : (
                            <div className="text-sm text-muted-foreground">
                              Targeted: {announcement.totalTargeted} users
                            </div>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="space-y-1">
                          {announcement.publishedAt && (
                            <div className="flex items-center gap-1 text-sm">
                              <Send className="h-3 w-3 text-muted-foreground" />
                              <span>{formatDate(announcement.publishedAt)}</span>
                            </div>
                          )}
                          {announcement.scheduledFor && (
                            <div className="flex items-center gap-1 text-sm">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span>{formatDate(announcement.scheduledFor)}</span>
                            </div>
                          )}
                          {announcement.expiresAt && (
                            <div className="text-xs text-muted-foreground">
                              Expires: {formatDate(announcement.expiresAt)}
                            </div>
                          )}
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
                            <DropdownMenuItem>
                              <Target className="mr-2 h-4 w-4" />
                              View Analytics
                            </DropdownMenuItem>
                            {announcement.status === 'draft' && (
                              <DropdownMenuItem>
                                <Send className="mr-2 h-4 w-4" />
                                Publish Now
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Pin className="mr-2 h-4 w-4" />
                              {announcement.isPinned ? 'Unpin' : 'Pin'}
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
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