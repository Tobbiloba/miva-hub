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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  BookOpen,
  Search,
  Filter,
  Download,
  Plus,
  Edit,
  Trash2,
  Eye,
  Users,
  MoreHorizontal,
  Calendar,
  User,
  GraduationCap,
  Clock,
  Building2,
  Award,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Course {
  id: string;
  courseCode: string;
  title: string;
  description?: string;
  credits: number;
  level: string;
  semesterOffered: string;
  isActive: boolean;
  departmentId: string;
  createdAt: string;
  updatedAt: string;
  department?: {
    id: string;
    name: string;
    code: string;
  };
}

interface Department {
  id: string;
  name: string;
  code: string;
}

export default function CoursesManagePage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [selectedLevel, setSelectedLevel] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const { toast } = useToast();
  const router = useRouter();

  // Fetch courses and departments
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch courses and departments in parallel
        const [coursesResponse, departmentsResponse] = await Promise.all([
          fetch('/api/admin/courses'),
          fetch('/api/admin/departments')
        ]);

        const coursesData = await coursesResponse.json();
        const departmentsData = await departmentsResponse.json();

        if (coursesData.success) {
          setCourses(coursesData.data);
        } else {
          toast({
            title: "Error",
            description: "Failed to load courses",
            variant: "destructive"
          });
        }

        if (departmentsData.success) {
          setDepartments(departmentsData.data);
        }

      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: "Error",
          description: "Failed to load data",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []); // Remove toast from dependencies to prevent infinite loop

  // Filter courses based on search and filters
  const filteredCourses = courses.filter(course => {
    const matchesSearch = searchTerm === "" || 
      course.courseCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (course.description && course.description.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesDepartment = selectedDepartment === "" || selectedDepartment === "all" || course.departmentId === selectedDepartment;
    const matchesLevel = selectedLevel === "" || selectedLevel === "all" || course.level === selectedLevel;
    const matchesStatus = selectedStatus === "" || selectedStatus === "all" || 
      (selectedStatus === "active" && course.isActive) ||
      (selectedStatus === "inactive" && !course.isActive);

    return matchesSearch && matchesDepartment && matchesLevel && matchesStatus;
  });

  const handleDeleteCourse = async () => {
    if (!courseToDelete) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/courses/${courseToDelete.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: data.message,
        });
        
        // Remove course from state
        setCourses(prev => prev.filter(c => c.id !== courseToDelete.id));
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to delete course",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error deleting course:', error);
      toast({
        title: "Error",
        description: "Failed to delete course",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setCourseToDelete(null);
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case "100L": return "bg-green-100 text-green-800";
      case "200L": return "bg-blue-100 text-blue-800";
      case "300L": return "bg-purple-100 text-purple-800";
      case "400L": return "bg-orange-100 text-orange-800";
      case "graduate": return "bg-indigo-100 text-indigo-800";
      case "doctoral": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getLevelLabel = (level: string) => {
    switch (level) {
      case "100L": return "100 Level";
      case "200L": return "200 Level";
      case "300L": return "300 Level";
      case "400L": return "400 Level";
      case "graduate": return "Graduate";
      case "doctoral": return "Doctoral";
      default: return level;
    }
  };

  // Calculate statistics
  const totalCourses = courses.length;
  const activeCourses = courses.filter(course => course.isActive).length;
  const totalCredits = courses.reduce((sum, course) => sum + course.credits, 0);
  const averageCredits = totalCourses > 0 ? Math.round(totalCredits / totalCourses * 10) / 10 : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BookOpen className="h-8 w-8 text-blue-600" />
            Course Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage academic courses, enrollments, and scheduling
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export Courses
          </Button>
          <Link href="/admin/courses/create">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Course
            </Button>
          </Link>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{totalCourses}</p>
                <p className="text-xs text-muted-foreground">Total Courses</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{activeCourses}</p>
                <p className="text-xs text-muted-foreground">Active Courses</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{totalCredits}</p>
                <p className="text-xs text-muted-foreground">Total Credits</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">{departments.length}</p>
                <p className="text-xs text-muted-foreground">Departments</p>
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
                  placeholder="Search courses by code, name, or description..." 
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.code} - {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedLevel} onValueChange={setSelectedLevel}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="100L">100 Level</SelectItem>
                <SelectItem value="200L">200 Level</SelectItem>
                <SelectItem value="300L">300 Level</SelectItem>
                <SelectItem value="400L">400 Level</SelectItem>
                <SelectItem value="graduate">Graduate</SelectItem>
                <SelectItem value="doctoral">Doctoral</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Course Table */}
      <Card>
        <CardHeader>
          <CardTitle>Course Catalog ({filteredCourses.length} courses)</CardTitle>
          <CardDescription>
            All academic courses and their current status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Semester</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCourses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="text-muted-foreground">
                        {courses.length === 0 ? "No courses found" : "No courses match your filters"}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCourses.map((course) => (
                    <TableRow key={course.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                            <BookOpen className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium">{course.courseCode}</p>
                            <p className="text-sm text-muted-foreground">{course.title}</p>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {course.department ? course.department.name : 'Unknown'}
                          </span>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <Badge variant="secondary" className={getLevelColor(course.level)}>
                          {getLevelLabel(course.level)}
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Award className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{course.credits}</span>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <span className="text-sm capitalize">{course.semesterOffered}</span>
                      </TableCell>
                      
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={course.isActive ? "bg-green-100 text-green-800 border-green-200" : "bg-gray-100 text-gray-800 border-gray-200"}
                        >
                          {course.isActive ? "Active" : "Inactive"}
                        </Badge>
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
                            <DropdownMenuItem 
                              onClick={() => router.push(`/admin/courses/${course.id}`)}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => router.push(`/admin/courses/${course.id}/edit`)}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Course
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => {
                                setCourseToDelete(course);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Course
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Course</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the course &quot;{courseToDelete?.courseCode} - {courseToDelete?.title}&quot;? 
              This action cannot be undone and will remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteCourse}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Course"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}