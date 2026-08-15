"use client";

import { appStore } from "@/app/store";
import { BookOpenCheck, ChevronDown, GraduationCap } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "ui/dropdown-menu";
import { cn } from "lib/utils";
import { useShallow } from "zustand/shallow";

interface EnrolledCourse {
  id: string;
  courseCode: string;
  title: string;
}

/**
 * Lets an enrolled student pick a course to ground the main chat in. When a
 * course is selected, the chat answers from that course's materials and cites
 * sources. Renders nothing for users with no enrolled courses (e.g. staff),
 * so it stays invisible outside the student experience.
 */
export function CourseContextSelector() {
  const [courseId, courseLabel, mutate] = appStore(
    useShallow((state) => [
      state.chatCourseId,
      state.chatCourseLabel,
      state.mutate,
    ]),
  );
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/student/tutor")
      .then((res) => (res.ok ? res.json() : { courses: [] }))
      .then((data) => {
        if (!active) return;
        setCourses(data.courses ?? []);
        setLoaded(true);
      })
      .catch(() => active && setLoaded(true));
    return () => {
      active = false;
    };
  }, []);

  // A stale selection (course no longer enrolled) shouldn't linger.
  useEffect(() => {
    if (loaded && courseId && !courses.some((c) => c.id === courseId)) {
      mutate({ chatCourseId: undefined, chatCourseLabel: undefined });
    }
  }, [loaded, courseId, courses, mutate]);

  if (!loaded || courses.length === 0) return null;

  const active = !!courseId;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "rounded-full hover:bg-input! mr-1 gap-1.5",
            active && "text-primary",
          )}
          data-testid="course-context-button"
        >
          {active ? (
            <BookOpenCheck className="size-3.5" />
          ) : (
            <GraduationCap className="size-3.5" />
          )}
          <span className="max-w-[8rem] truncate">
            {active ? courseLabel : "Course"}
          </span>
          <ChevronDown className="size-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-64">
        <DropdownMenuLabel>Ground answers in a course</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={!active}
          onCheckedChange={() =>
            mutate({ chatCourseId: undefined, chatCourseLabel: undefined })
          }
        >
          No course — general chat
        </DropdownMenuCheckboxItem>
        {courses.map((course) => (
          <DropdownMenuCheckboxItem
            key={course.id}
            checked={courseId === course.id}
            onCheckedChange={() =>
              mutate({
                chatCourseId: course.id,
                chatCourseLabel: course.courseCode,
              })
            }
          >
            <span className="flex flex-col">
              <span className="font-medium">{course.courseCode}</span>
              <span className="text-muted-foreground text-xs truncate">
                {course.title}
              </span>
            </span>
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
