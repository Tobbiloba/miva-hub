import { CourseTutor } from "@/components/student/course-tutor";

export default function StudentTutorPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">AI Tutor</h1>
        <p className="text-muted-foreground mt-1">
          A tutor that has read your entire course — every answer cites the
          exact material it came from.
        </p>
      </div>
      <CourseTutor />
    </div>
  );
}
