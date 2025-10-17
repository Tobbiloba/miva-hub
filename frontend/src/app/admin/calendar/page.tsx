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
  Calendar,
  Search,
  Filter,
  Download,
  Plus,
  Edit,
  Trash2,
  Eye,
  Clock,
  MoreHorizontal,
  BookOpen,
  GraduationCap,
  AlertTriangle,
  CheckCircle,
  CalendarDays,
  Users,
  FileText,
  Bell,
  Loader2
} from "lucide-react";
import { toast } from "sonner";

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  type: string;
  date: string;
  endDate: string;
  time?: string;
  endTime?: string;
  location?: string;
  priority: string;
  status: string;
  affectedUsers: string;
  creator: string;
  course?: string | null;
  department?: string | null;
  isAllDay: boolean;
  isRecurring: boolean;
  remindersEnabled: boolean;
  attendeeCount: number;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export default function CalendarManagePage() {
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [timeRangeFilter, setTimeRangeFilter] = useState("all");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  const fetchCalendarEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Build query parameters
      const params = new URLSearchParams();
      if (debouncedSearchTerm) params.append('search', debouncedSearchTerm);
      if (typeFilter !== 'all') params.append('eventType', typeFilter);
      if (priorityFilter !== 'all') params.append('priority', priorityFilter);
      
      // Handle time range filters
      if (timeRangeFilter !== 'all') {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        
        switch (timeRangeFilter) {
          case 'upcoming':
            const futureDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
            params.append('startDate', todayStr);
            params.append('endDate', futureDate.toISOString().split('T')[0]);
            break;
          case 'this-month':
            const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
            const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            params.append('startDate', monthStart.toISOString().split('T')[0]);
            params.append('endDate', monthEnd.toISOString().split('T')[0]);
            break;
          case 'next-month':
            const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1);
            const nextMonthEnd = new Date(today.getFullYear(), today.getMonth() + 2, 0);
            params.append('startDate', nextMonthStart.toISOString().split('T')[0]);
            params.append('endDate', nextMonthEnd.toISOString().split('T')[0]);
            break;
        }
      }
      
      const response = await fetch(`/api/admin/calendar?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch calendar events');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setCalendarEvents(data.data);
      } else {
        throw new Error(data.message || 'Failed to fetch calendar events');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      toast.error('Failed to load calendar events');
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
    fetchCalendarEvents();
  }, [debouncedSearchTerm, typeFilter, priorityFilter, timeRangeFilter]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  const handleTypeFilter = (value: string) => {
    setTypeFilter(value);
  };

  const handlePriorityFilter = (value: string) => {
    setPriorityFilter(value);
  };

  const handleTimeRangeFilter = (value: string) => {
    setTimeRangeFilter(value);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "academic": return "bg-blue-100 text-blue-800";
      case "registration": return "bg-green-100 text-green-800";
      case "exam": return "bg-red-100 text-red-800";
      case "holiday": return "bg-yellow-100 text-yellow-800";
      case "professional": return "bg-purple-100 text-purple-800";
      case "ceremony": return "bg-indigo-100 text-indigo-800";
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return CheckCircle;
      case "scheduled": return Clock;
      case "cancelled": return AlertTriangle;
      default: return Calendar;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const isUpcoming = (dateString: string) => {
    const eventDate = new Date(dateString);
    const today = new Date();
    const diffTime = eventDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 30;
  };

  // Calculate statistics
  const totalEvents = calendarEvents.length;
  const upcomingEvents = calendarEvents.filter(event => isUpcoming(event.date)).length;
  const highPriorityEvents = calendarEvents.filter(event => event.priority === 'high').length;
  const activeReminders = calendarEvents.filter(event => event.remindersEnabled).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading calendar events...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Error Loading Calendar</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchCalendarEvents} variant="outline">
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
            <Calendar className="h-8 w-8 text-blue-600" />
            Academic Calendar
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage academic events, schedules, and important dates
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export Calendar
          </Button>
          <Button asChild>
            <a href="/admin/calendar/create">
              <Plus className="mr-2 h-4 w-4" />
              Add Event
            </a>
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{totalEvents}</p>
                <p className="text-xs text-muted-foreground">Total Events</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{upcomingEvents}</p>
                <p className="text-xs text-muted-foreground">Upcoming (30 days)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-2xl font-bold">{highPriorityEvents}</p>
                <p className="text-xs text-muted-foreground">High Priority</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">{activeReminders}</p>
                <p className="text-xs text-muted-foreground">Active Reminders</p>
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
                  placeholder="Search events by title, type, or description..." 
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={handleTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Event Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="academic">Academic</SelectItem>
                <SelectItem value="registration">Registration</SelectItem>
                <SelectItem value="exam">Examinations</SelectItem>
                <SelectItem value="holiday">Holidays</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="ceremony">Ceremonies</SelectItem>
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
            <Select value={timeRangeFilter} onValueChange={handleTimeRangeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="upcoming">Upcoming (30 days)</SelectItem>
                <SelectItem value="this-month">This Month</SelectItem>
                <SelectItem value="next-month">Next Month</SelectItem>
                <SelectItem value="this-semester">This Semester</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" disabled={loading}>
              <Filter className="mr-2 h-4 w-4" />
              More Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Events Table */}
      <Card>
        <CardHeader>
          <CardTitle>Academic Events</CardTitle>
          <CardDescription>
            All scheduled academic events and important dates
          </CardDescription>
        </CardHeader>
        <CardContent>
          {calendarEvents.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Events Found</h3>
                <p className="text-muted-foreground mb-4">
                  {debouncedSearchTerm || typeFilter !== 'all' || priorityFilter !== 'all' || timeRangeFilter !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'Create your first calendar event to get started'
                  }
                </p>
                <Button asChild>
                  <a href="/admin/calendar/create">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Event
                  </a>
                </Button>
              </div>
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Date Range</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Affected Users</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reminders</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calendarEvents.map((event) => {
                  const StatusIcon = getStatusIcon(event.status);
                  const isDateRange = event.date !== event.endDate;
                  return (
                    <TableRow key={event.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                            <Calendar className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium">{event.title}</p>
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {event.description}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm font-medium">
                            {formatDate(event.date)}
                          </div>
                          {isDateRange && (
                            <div className="text-xs text-muted-foreground">
                              to {formatDate(event.endDate)}
                            </div>
                          )}
                          {isUpcoming(event.date) && (
                            <Badge variant="outline" className="text-xs bg-blue-50">
                              Upcoming
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <Badge variant="secondary" className={getTypeColor(event.type)}>
                          {event.type}
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        <Badge variant="outline" className={getPriorityColor(event.priority)}>
                          {event.priority}
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm capitalize">
                            {event.affectedUsers.replace(',', ', ')}
                          </span>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <StatusIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm capitalize">{event.status}</span>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Bell className={`h-4 w-4 ${event.remindersEnabled ? 'text-green-600' : 'text-gray-400'}`} />
                          <span className="text-sm">
                            {event.remindersEnabled ? 'Enabled' : 'Disabled'}
                          </span>
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
                              <Bell className="mr-2 h-4 w-4" />
                              Manage Reminders
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Users className="mr-2 h-4 w-4" />
                              View Affected Users
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Event
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Event
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