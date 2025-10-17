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
  Target,
  Loader2
} from "lucide-react";
import { toast } from "sonner";

interface Announcement {
  id: string;
  title: string;
  content: string;
  author: string;
  audience: string;
  department: string;
  priority: string;
  status: string;
  publishedAt: string | null;
  scheduledFor: string | null;
  readCount: number;
  totalTargeted: number;
  isPinned: boolean;
  expiresAt: string | null;
  courses: string[];
  attachments: string[];
}

export default function AnnouncementsManagePage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [audienceFilter, setAudienceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Build query parameters
      const params = new URLSearchParams();
      if (debouncedSearchTerm) params.append('search', debouncedSearchTerm);
      if (audienceFilter !== 'all') params.append('audience', audienceFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (priorityFilter !== 'all') params.append('priority', priorityFilter);
      
      const response = await fetch(`/api/admin/announcements?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch announcements');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setAnnouncements(data.data);
      } else {
        throw new Error(data.message || 'Failed to fetch announcements');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      toast.error('Failed to load announcements');
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
    fetchAnnouncements();
  }, [debouncedSearchTerm, audienceFilter, statusFilter, priorityFilter]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  const handleAudienceFilter = (value: string) => {
    setAudienceFilter(value);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
  };

  const handlePriorityFilter = (value: string) => {
    setPriorityFilter(value);
  };

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
                <Input 
                  placeholder="Search announcements by title, content, or author..." 
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
            </div>
            <Select value={audienceFilter} onValueChange={handleAudienceFilter}>
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
            <Select value={statusFilter} onValueChange={handleStatusFilter}>
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
            <Select value={priorityFilter} onValueChange={handlePriorityFilter}>
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
            <Button variant="outline" size="sm" disabled={loading}>
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
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Loading announcements...</span>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Error Loading Announcements</h3>
                <p className="text-muted-foreground mb-4">{error}</p>
                <Button onClick={fetchAnnouncements} variant="outline">
                  Try Again
                </Button>
              </div>
            </div>
          ) : announcements.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Megaphone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Announcements Found</h3>
                <p className="text-muted-foreground mb-4">
                  {debouncedSearchTerm || audienceFilter !== 'all' || statusFilter !== 'all' || priorityFilter !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'Create your first announcement to get started'
                  }
                </p>
                <Button asChild>
                  <a href="/admin/announcements/create">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Announcement
                  </a>
                </Button>
              </div>
            </div>
          ) : (
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}