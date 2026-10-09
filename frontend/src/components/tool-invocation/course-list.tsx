"use client";

import { GraduationCap } from "lucide-react";
import { ToolCard, joinMeta } from "./tool-card";
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
  const totalCredits =
    props.total_credits || props.courses.reduce((sum, c) => sum + c.credits, 0);

  return (
    <ToolCard
      icon={<GraduationCap />}
      eyebrow={joinMeta("Your courses", props.semester)}
      title={`${totalCourses} ${totalCourses === 1 ? "course" : "courses"} · ${totalCredits} credits`}
      bodyClassName="px-0 pb-0"
    >
      <ul className="divide-y divide-border border-t border-border">
        {props.courses.map((course, index) => (
          <li key={index} className="flex items-center gap-4 px-5 py-3.5">
            <span className="w-[4.5rem] shrink-0 rounded-md bg-secondary px-2 py-1 text-center text-xs font-semibold tracking-wide tabular-nums">
              {course.course_code}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {course.course_name}
              </p>
              <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
                {joinMeta(
                  course.instructor,
                  course.status &&
                    course.status.charAt(0).toUpperCase() +
                      course.status.slice(1),
                  course.grade && `Grade ${course.grade}`,
                )}
              </p>
            </div>
            <span className="shrink-0 text-right text-[13px] tabular-nums text-muted-foreground">
              <span className="font-medium text-foreground">
                {course.credits}
              </span>{" "}
              {course.credits === 1 ? "credit" : "credits"}
            </span>
          </li>
        ))}
      </ul>
    </ToolCard>
  );
}
