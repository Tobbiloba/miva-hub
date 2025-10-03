"use client";
import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

interface Course {
  id: string;
  courseCode: string;
  title: string;
  departmentId: string;
}

interface Department {
  id: string;
  name: string;
  code: string;
}

interface CourseSelectorProps {
  onCourseSelect: (courseId: string) => void;
  selectedCourse?: string;
}

export function CourseSelector({ onCourseSelect, selectedCourse }: CourseSelectorProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [coursesLoading, setCoursesLoading] = useState(false);

  useEffect(() => {
    // Fetch departments
    fetch('/api/departments')
      .then(res => res.json())
      .then(data => {
        setDepartments(data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Failed to fetch departments:', error);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (selectedDepartment) {
      setCoursesLoading(true);
      fetch(`/api/courses?departmentId=${selectedDepartment}`)
        .then(res => res.json())
        .then(data => {
          setCourses(data);
          setCoursesLoading(false);
        })
        .catch(error => {
          console.error('Failed to fetch courses:', error);
          setCoursesLoading(false);
        });
    } else {
      setCourses([]);
    }
  }, [selectedDepartment]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Department</Label>
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Label>Course</Label>
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="department">Department</Label>
        <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
          <SelectTrigger>
            <SelectValue placeholder="Select a department" />
          </SelectTrigger>
          <SelectContent>
            {departments.map((dept) => (
              <SelectItem key={dept.id} value={dept.id}>
                {dept.name} ({dept.code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="course">Course</Label>
        <Select 
          value={selectedCourse} 
          onValueChange={onCourseSelect}
          disabled={!selectedDepartment || coursesLoading}
        >
          <SelectTrigger>
            <SelectValue placeholder={
              !selectedDepartment 
                ? "Select a department first" 
                : coursesLoading 
                  ? "Loading courses..." 
                  : "Select a course"
            } />
          </SelectTrigger>
          <SelectContent>
            {courses.map((course) => (
              <SelectItem key={course.id} value={course.id}>
                {course.courseCode} - {course.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}