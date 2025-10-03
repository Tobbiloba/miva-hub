"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, BookOpen, Save, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";

interface Department {
  id: string;
  name: string;
  code: string;
}

interface Course {
  id: string;
  courseCode: string;
  title: string;
  description?: string;
  credits: number;
  departmentId: string;
  level: string;
  semesterOffered: string;
  isActive: boolean;
  department?: {
    id: string;
    name: string;
    code: string;
  };
}

interface CourseFormData {
  courseCode: string;
  title: string;
  description: string;
  credits: number;
  departmentId: string;
  level: string;
  semesterOffered: string;
  isActive: boolean;
}

const academicLevels = [
  { value: "100L", label: "100 Level (Freshman)" },
  { value: "200L", label: "200 Level (Sophomore)" },
  { value: "300L", label: "300 Level (Junior)" },
  { value: "400L", label: "400 Level (Senior)" },
  { value: "graduate", label: "Graduate Level" },
  { value: "doctoral", label: "Doctoral Level" }
];

const semesterOptions = [
  { value: "fall", label: "Fall Semester" },
  { value: "spring", label: "Spring Semester" },
  { value: "summer", label: "Summer Semester" },
  { value: "both", label: "Both Fall & Spring" }
];

export default function EditCoursePage() {
  const [formData, setFormData] = useState<CourseFormData>({
    courseCode: "",
    title: "",
    description: "",
    credits: 3,
    departmentId: "",
    level: "100L",
    semesterOffered: "both",
    isActive: true
  });
  const [originalCourse, setOriginalCourse] = useState<Course | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [errors, setErrors] = useState<Partial<CourseFormData>>({});
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;

  // Fetch course data and departments on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoadingData(true);
        
        // Fetch course and departments in parallel
        const [courseResponse, departmentsResponse] = await Promise.all([
          fetch(`/api/admin/courses/${courseId}`),
          fetch('/api/admin/departments')
        ]);

        const courseData = await courseResponse.json();
        const departmentsData = await departmentsResponse.json();

        if (courseData.success) {
          const course = courseData.data;
          setOriginalCourse(course);
          setFormData({
            courseCode: course.courseCode,
            title: course.title,
            description: course.description || "",
            credits: course.credits,
            departmentId: course.departmentId,
            level: course.level,
            semesterOffered: course.semesterOffered,
            isActive: course.isActive
          });
        } else {
          toast({
            title: "Error",
            description: "Failed to load course data",
            variant: "destructive"
          });
          router.push('/admin/courses');
        }

        if (departmentsData.success) {
          setDepartments(departmentsData.data);
        } else {
          toast({
            title: "Error",
            description: "Failed to load departments",
            variant: "destructive"
          });
        }

      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: "Error",
          description: "Failed to load data",
          variant: "destructive"
        });
        router.push('/admin/courses');
      } finally {
        setIsLoadingData(false);
      }
    };

    if (courseId) {
      fetchData();
    }
  }, [courseId]); // Remove toast and router from dependencies to prevent infinite loop

  const validateForm = (): boolean => {
    const newErrors: Partial<CourseFormData> = {};

    if (!formData.courseCode.trim()) {
      newErrors.courseCode = "Course code is required";
    } else if (formData.courseCode.length > 20) {
      newErrors.courseCode = "Course code must be 20 characters or less";
    }

    if (!formData.title.trim()) {
      newErrors.title = "Course title is required";
    } else if (formData.title.length > 200) {
      newErrors.title = "Title must be 200 characters or less";
    }

    if (formData.credits < 1 || formData.credits > 6) {
      newErrors.credits = "Credits must be between 1 and 6";
    }

    if (!formData.departmentId) {
      newErrors.departmentId = "Department is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof CourseFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error for this field if it exists
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/admin/courses/${courseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: data.message,
        });
        
        // Redirect to courses list
        router.push('/admin/courses');
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to update course",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error updating course:', error);
      toast({
        title: "Error",
        description: "Failed to update course. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!originalCourse) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Course Not Found</h2>
          <p className="text-muted-foreground mt-2">The course you&apos;re looking for doesn&apos;t exist.</p>
          <Link href="/admin/courses">
            <Button className="mt-4">Back to Courses</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/courses">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Courses
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BookOpen className="h-8 w-8 text-blue-600" />
            Edit Course
          </h1>
          <p className="text-muted-foreground mt-1">
            Modify course &quot;{originalCourse.courseCode} - {originalCourse.title}&quot;
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Course Information</CardTitle>
          <CardDescription>
            Update the course details below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Course Code and Credits Row */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="courseCode">Course Code *</Label>
                <Input
                  id="courseCode"
                  placeholder="e.g., CS101, MATH201"
                  value={formData.courseCode}
                  onChange={(e) => handleInputChange('courseCode', e.target.value.toUpperCase())}
                />
                {errors.courseCode && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.courseCode}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="credits">Credits *</Label>
                <Select
                  value={formData.credits.toString()}
                  onValueChange={(value) => handleInputChange('credits', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select credits" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6].map((credit) => (
                      <SelectItem key={credit} value={credit.toString()}>
                        {credit} Credit{credit > 1 ? 's' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.credits && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.credits}
                  </p>
                )}
              </div>
            </div>

            {/* Course Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Course Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Introduction to Computer Science"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
              />
              {errors.title && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.title}
                </p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Course Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of the course content and objectives"
                rows={3}
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
              />
            </div>

            {/* Department and Level Row */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="department">Department *</Label>
                <Select
                  value={formData.departmentId}
                  onValueChange={(value) => handleInputChange('departmentId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.code} - {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.departmentId && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.departmentId}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="level">Academic Level *</Label>
                <Select
                  value={formData.level}
                  onValueChange={(value) => handleInputChange('level', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    {academicLevels.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Semester Offered */}
            <div className="space-y-2">
              <Label htmlFor="semester">Semester Offered</Label>
              <Select
                value={formData.semesterOffered}
                onValueChange={(value) => handleInputChange('semesterOffered', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select semester" />
                </SelectTrigger>
                <SelectContent>
                  {semesterOptions.map((semester) => (
                    <SelectItem key={semester.value} value={semester.value}>
                      {semester.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Active Status */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => handleInputChange('isActive', checked)}
              />
              <Label htmlFor="isActive">
                Course is active and available for enrollment
              </Label>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-4 pt-4 border-t">
              <Link href="/admin/courses">
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Update Course
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}