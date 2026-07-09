"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GraduationCap, Loader2, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface Course {
  id: string;
  courseCode: string;
  title: string;
}

interface Student {
  name: string;
  email: string;
  studentId: string | null;
  enrollmentStatus: string;
  finalGrade: string | null;
}

export default function FacultyStudentsPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [, setLoadingCourses] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      fetchStudents(selectedCourse);
    } else {
      setStudents([]);
    }
  }, [selectedCourse]);

  const fetchCourses = async () => {
    try {
      const res = await fetch("/api/faculty/courses");
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setCourses(data.data || []);
    } catch {
      toast.error("Failed to load courses");
    } finally {
      setLoadingCourses(false);
    }
  };

  const fetchStudents = async (courseId: string) => {
    setLoadingStudents(true);
    try {
      const res = await fetch(`/api/faculty/students?courseId=${courseId}`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setStudents(data.data || []);
    } catch {
      toast.error("Failed to load students");
    } finally {
      setLoadingStudents(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Users className="h-8 w-8 text-blue-600" />
          Students
        </h1>
        <p className="text-muted-foreground">
          Students enrolled in your courses
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Student Roster</span>
            <div className="w-64">
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.courseCode} — {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedCourse ? (
            <div className="text-center py-12">
              <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                Select a course to view enrolled students
              </p>
            </div>
          ) : loadingStudents ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : students.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No students enrolled in this course.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Grade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {s.email}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {s.studentId || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          s.enrollmentStatus === "enrolled"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {s.enrollmentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>{s.finalGrade || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
