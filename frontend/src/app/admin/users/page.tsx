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
  Users,
  Search,
  Filter,
  Download,
  Plus,
  Edit,
  Trash2,
  Eye,
  UserCheck,
  UserX,
  MoreHorizontal,
  Calendar,
  Shield,
  GraduationCap,
  BookOpen,
  Building2,
  Mail,
  Phone,
  Clock,
  Key,
  Activity
} from "lucide-react";
import { getSession } from "@/lib/auth/server";
import { requireAdmin } from "@/lib/auth/admin";

export default async function UsersManagePage() {
  const session = await getSession();
  const adminAccess = await requireAdmin();

  if (adminAccess instanceof Response) {
    return <div>Access denied. Admin privileges required.</div>;
  }

  // Mock user data (in real app, this would come from database)
  const users = [
    {
      id: "1",
      name: "John Smith",
      email: "john.smith@miva.edu.ng",
      role: "student",
      status: "active",
      department: "Computer Science",
      studentId: "MIVA2024001",
      level: "300",
      joinDate: "2024-01-15",
      lastLogin: "2024-03-20T10:30:00Z",
      phone: "+234-801-234-5678",
      gpa: 3.45,
      creditsCompleted: 87
    },
    {
      id: "2", 
      name: "Dr. Sarah Johnson",
      email: "sarah.johnson@miva.edu.ng",
      role: "faculty",
      status: "active",
      department: "Computer Science",
      employeeId: "FAC-CS-001",
      position: "associate_professor",
      joinDate: "2019-08-01",
      lastLogin: "2024-03-21T09:15:00Z",
      phone: "+234-802-345-6789",
      officeLocation: "CS-301",
      coursesTeaching: 3
    },
    {
      id: "3",
      name: "Prof. Michael Chen",
      email: "michael.chen@miva.edu.ng", 
      role: "faculty",
      status: "active",
      department: "Computer Science",
      employeeId: "FAC-CS-002",
      position: "professor",
      joinDate: "2015-09-01",
      lastLogin: "2024-03-20T14:22:00Z",
      phone: "+234-803-456-7890",
      officeLocation: "CS-205",
      coursesTeaching: 2
    },
    {
      id: "4",
      name: "Emily Rodriguez",
      email: "emily.rodriguez@miva.edu.ng",
      role: "admin",
      status: "active",
      department: "Administration",
      employeeId: "ADM-001",
      position: "registrar",
      joinDate: "2020-06-15",
      lastLogin: "2024-03-21T11:45:00Z",
      phone: "+234-804-567-8901",
      permissions: ["user_management", "academic_records", "system_settings"]
    },
    {
      id: "5",
      name: "Maria Garcia",
      email: "maria.garcia@miva.edu.ng",
      role: "student",
      status: "active",
      department: "Business",
      studentId: "MIVA2023045",
      level: "400",
      joinDate: "2023-08-20",
      lastLogin: "2024-03-19T16:30:00Z",
      phone: "+234-805-678-9012",
      gpa: 3.78,
      creditsCompleted: 112
    },
    {
      id: "6",
      name: "David Wilson",
      email: "david.wilson@miva.edu.ng",
      role: "faculty",
      status: "inactive",
      department: "Mathematics",
      employeeId: "FAC-MATH-001",
      position: "assistant_professor",
      joinDate: "2021-01-10",
      lastLogin: "2024-02-15T09:30:00Z",
      phone: "+234-806-789-0123",
      officeLocation: "MATH-101",
      coursesTeaching: 0
    },
    {
      id: "7",
      name: "Alex Thompson", 
      email: "alex.thompson@miva.edu.ng",
      role: "student",
      status: "suspended",
      department: "Engineering",
      studentId: "MIVA2022078",
      level: "200",
      joinDate: "2022-09-05",
      lastLogin: "2024-01-20T12:15:00Z",
      phone: "+234-807-890-1234",
      gpa: 2.15,
      creditsCompleted: 45
    },
    {
      id: "8",
      name: "Lisa Park",
      email: "lisa.park@miva.edu.ng",
      role: "admin",
      status: "active",
      department: "IT Services",
      employeeId: "ADM-IT-001",
      position: "it_administrator",
      joinDate: "2022-03-01",
      lastLogin: "2024-03-21T08:00:00Z",
      phone: "+234-808-901-2345",
      permissions: ["system_admin", "network_management", "security"]
    }
  ];

  const getRoleColor = (role: string) => {
    switch (role) {
      case "student": return "bg-blue-100 text-blue-800";
      case "faculty": return "bg-green-100 text-green-800";
      case "admin": return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800 border-green-200";
      case "inactive": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "suspended": return "bg-red-100 text-red-800 border-red-200";
      case "pending": return "bg-blue-100 text-blue-800 border-blue-200";
      default: return "";
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "student": return GraduationCap;
      case "faculty": return BookOpen;
      case "admin": return Shield;
      default: return Users;
    }
  };

  const formatPosition = (position?: string) => {
    if (!position) return '';
    return position
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatLastLogin = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  // Calculate statistics
  const totalUsers = users.length;
  const activeUsers = users.filter(user => user.status === 'active').length;
  const studentCount = users.filter(user => user.role === 'student').length;
  const facultyCount = users.filter(user => user.role === 'faculty').length;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8 text-blue-600" />
            User Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage all system users, roles, and permissions
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export Users
          </Button>
          <Button asChild>
            <a href="/admin/users/create">
              <Plus className="mr-2 h-4 w-4" />
              Add User
            </a>
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{totalUsers}</p>
                <p className="text-xs text-muted-foreground">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{activeUsers}</p>
                <p className="text-xs text-muted-foreground">Active Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{studentCount}</p>
                <p className="text-xs text-muted-foreground">Students</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">{facultyCount}</p>
                <p className="text-xs text-muted-foreground">Faculty</p>
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
                <Input placeholder="Search users by name, email, or ID..." className="pl-10" />
              </div>
            </div>
            <Select>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="student">Students</SelectItem>
                <SelectItem value="faculty">Faculty</SelectItem>
                <SelectItem value="admin">Administrators</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                <SelectItem value="computer-science">Computer Science</SelectItem>
                <SelectItem value="mathematics">Mathematics</SelectItem>
                <SelectItem value="business">Business</SelectItem>
                <SelectItem value="engineering">Engineering</SelectItem>
                <SelectItem value="administration">Administration</SelectItem>
                <SelectItem value="it-services">IT Services</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              More Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>System Users</CardTitle>
          <CardDescription>
            All registered users in the system with their roles and status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const RoleIcon = getRoleIcon(user.role);
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                            <RoleIcon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                            {(user.studentId || user.employeeId) && (
                              <p className="text-xs text-muted-foreground">
                                ID: {user.studentId || user.employeeId}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <Badge variant="secondary" className={getRoleColor(user.role)}>
                          {user.role}
                        </Badge>
                        {user.position && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatPosition(user.position)}
                          </p>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{user.department}</span>
                        </div>
                        {user.level && (
                          <p className="text-xs text-muted-foreground">
                            Level {user.level}
                          </p>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(user.status)}>
                          {user.status}
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            <span className="truncate max-w-[120px]" title={user.email}>
                              {user.email.split('@')[0]}
                            </span>
                          </div>
                          {user.phone && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              <span>{user.phone}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span>{formatLastLogin(user.lastLogin)}</span>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="text-sm space-y-1">
                          {user.role === 'student' && (
                            <>
                              <div>GPA: {user.gpa}</div>
                              <div className="text-xs text-muted-foreground">
                                Credits: {user.creditsCompleted}
                              </div>
                            </>
                          )}
                          {user.role === 'faculty' && (
                            <>
                              <div>Office: {user.officeLocation}</div>
                              <div className="text-xs text-muted-foreground">
                                Courses: {user.coursesTeaching}
                              </div>
                            </>
                          )}
                          {user.role === 'admin' && user.permissions && (
                            <div className="text-xs text-muted-foreground">
                              {user.permissions.length} permissions
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
                              View Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Activity className="mr-2 h-4 w-4" />
                              View Activity
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Key className="mr-2 h-4 w-4" />
                              Reset Password
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit User
                            </DropdownMenuItem>
                            {user.status === 'active' ? (
                              <DropdownMenuItem className="text-yellow-600">
                                <UserX className="mr-2 h-4 w-4" />
                                Deactivate
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem className="text-green-600">
                                <UserCheck className="mr-2 h-4 w-4" />
                                Activate
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete User
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