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
  Bell
} from "lucide-react";
import { getSession } from "@/lib/auth/server";
import { requireAdmin } from "@/lib/auth/admin";

export default async function CalendarManagePage() {
  const session = await getSession();
  const adminAccess = await requireAdmin();

  if (adminAccess instanceof Response) {
    return <div>Access denied. Admin privileges required.</div>;
  }

  // Mock calendar events (in real app, this would come from database)
  const calendarEvents = [
    {
      id: "1",
      title: "Fall 2024 Semester Begins",
      date: "2024-08-26",
      endDate: "2024-08-26",
      type: "academic",
      priority: "high",
      status: "scheduled",
      description: "First day of classes for Fall 2024 semester",
      affectedUsers: "all",
      createdBy: "Academic Office",
      reminders: true
    },
    {
      id: "2", 
      title: "Course Registration Opens",
      date: "2024-04-01",
      endDate: "2024-04-15",
      type: "registration",
      priority: "high",
      status: "completed",
      description: "Spring 2025 course registration period",
      affectedUsers: "students",
      createdBy: "Registrar",
      reminders: true
    },
    {
      id: "3",
      title: "Midterm Examinations",
      date: "2024-10-14",
      endDate: "2024-10-18",
      type: "exam",
      priority: "high",
      status: "scheduled",
      description: "Fall 2024 midterm examination week",
      affectedUsers: "students,faculty",
      createdBy: "Academic Office",
      reminders: true
    },
    {
      id: "4",
      title: "Thanksgiving Break",
      date: "2024-11-25",
      endDate: "2024-11-29",
      type: "holiday",
      priority: "medium",
      status: "scheduled", 
      description: "University closed for Thanksgiving holiday",
      affectedUsers: "all",
      createdBy: "Administration",
      reminders: false
    },
    {
      id: "5",
      title: "Faculty Development Workshop",
      date: "2024-09-15",
      endDate: "2024-09-15",
      type: "professional",
      priority: "medium",
      status: "scheduled",
      description: "Professional development workshop for teaching staff",
      affectedUsers: "faculty",
      createdBy: "HR Department",
      reminders: true
    },
    {
      id: "6",
      title: "Final Examinations",
      date: "2024-12-09",
      endDate: "2024-12-13",
      type: "exam",
      priority: "high",
      status: "scheduled",
      description: "Fall 2024 final examination week",
      affectedUsers: "students,faculty",
      createdBy: "Academic Office",
      reminders: true
    },
    {
      id: "7",
      title: "Spring 2025 Semester Begins",
      date: "2025-01-13",
      endDate: "2025-01-13",
      type: "academic",
      priority: "high",
      status: "scheduled",
      description: "First day of classes for Spring 2025 semester",
      affectedUsers: "all",
      createdBy: "Academic Office",
      reminders: true
    },
    {
      id: "8",
      title: "Graduation Ceremony",
      date: "2024-12-20",
      endDate: "2024-12-20",
      type: "ceremony",
      priority: "high",
      status: "scheduled",
      description: "Fall 2024 commencement ceremony",
      affectedUsers: "students,faculty",
      createdBy: "Academic Office",
      reminders: true
    }
  ];

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
  const activeReminders = calendarEvents.filter(event => event.reminders).length;

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
                <Input placeholder="Search events by title, type, or description..." className="pl-10" />
              </div>
            </div>
            <Select>
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
            <Select>
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
            <Button variant="outline" size="sm">
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
                          <Bell className={`h-4 w-4 ${event.reminders ? 'text-green-600' : 'text-gray-400'}`} />
                          <span className="text-sm">
                            {event.reminders ? 'Enabled' : 'Disabled'}
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
        </CardContent>
      </Card>
    </div>
  );
}