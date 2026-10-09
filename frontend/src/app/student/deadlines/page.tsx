import {
  type DeadlineDTO,
  DeadlinesBoard,
} from "@/components/deadlines/deadlines-board";
import { getSession } from "@/lib/auth/server";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import { listDeadlines } from "@/lib/deadlines";
import { redirect } from "next/navigation";

export default async function DeadlinesPage() {
  const session = await getSession();
  if (!session?.user) redirect("/sign-in");

  const studentId = session.user.id;
  const [deadlines, courses] = await Promise.all([
    listDeadlines(studentId, {
      includeDone: true,
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    }),
    pgAcademicRepository.getStudentCourses(studentId),
  ]);

  const initialDeadlines: DeadlineDTO[] = deadlines.map((d) => ({
    ...d,
    dueAt: d.dueAt.toISOString(),
  }));

  return (
    <DeadlinesBoard
      initialDeadlines={initialDeadlines}
      courses={courses.map(({ course }) => ({
        id: course.id,
        courseCode: course.courseCode,
        title: course.title,
      }))}
    />
  );
}
