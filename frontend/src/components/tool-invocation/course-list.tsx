"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { GraduationCap, User, Calendar, TrendingUp } from "lucide-react";

type CourseListProps = {
  student_id?: string;
  semester?: string;
  total_courses?: number;
  total_credits?: number;
  courses: Array<{
    course_code: string;
    course_name: string;
    credits: number;
    instructor?: string;
    status?: string;
    enrollment_date?: string;
    grade?: string;
  }>;
};

export function CourseList(props: CourseListProps) {
  const totalCourses = props.total_courses || props.courses.length;
  const totalCredits = props.total_credits || props.courses.reduce((sum, c) => sum + c.credits, 0);

  return (
    <div className="space-y-4">
      <Card className="bg-card">
        <CardHeader>
          <CardTitle>Enrolled Courses</CardTitle>
          <CardDescription>
            {props.semester && <span>{props.semester}</span>}
            {props.student_id && (
              <>
                {props.semester && " • "}
                <span>Student ID: {props.student_id}</span>
              </>
            )}
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Courses</p>
                <p className="text-2xl font-bold">{totalCourses}</p>
              </div>
              <GraduationCap className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Credits</p>
                <p className="text-2xl font-bold">{totalCredits}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {props.courses.map((course, index) => (
          <Card key={index} className="bg-card hover:bg-secondary/20 transition-colors">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold text-sm">{course.course_code}</h4>
                    <span className="px-2 py-0.5 rounded-full bg-secondary/40 text-xs border">
                      {course.credits} {course.credits === 1 ? 'credit' : 'credits'}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{course.course_name}</p>
                </div>
              </div>

              <div className="space-y-2 text-sm text-muted-foreground">
                {course.instructor && (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span>{course.instructor}</span>
                  </div>
                )}
                {course.enrollment_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>Enrolled: {new Date(course.enrollment_date).toLocaleDateString()}</span>
                  </div>
                )}
                {course.status && (
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      course.status === 'enrolled' ? 'bg-green-500' : 
                      course.status === 'completed' ? 'bg-blue-500' : 
                      'bg-gray-400'
                    }`} />
                    <span className="capitalize">{course.status}</span>
                  </div>
                )}
                {course.grade && (
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Grade: {course.grade}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
