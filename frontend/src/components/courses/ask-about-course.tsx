"use client";

import { appStore } from "@/app/store";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "ui/button";

/** Opens a new chat grounded in this course (same state as the composer's
 * Course picker), so answers come from its materials. */
export function AskAboutCourse({
  courseId,
  courseCode,
}: {
  courseId: string;
  courseCode: string;
}) {
  const router = useRouter();
  const mutate = appStore((s) => s.mutate);
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-mx-2 w-fit text-brand hover:bg-tint-blue hover:text-brand"
      onClick={() => {
        mutate({ chatCourseId: courseId, chatCourseLabel: courseCode });
        router.push("/");
      }}
    >
      Ask about {courseCode}
      <ArrowRight />
    </Button>
  );
}
