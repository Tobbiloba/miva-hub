import { redirect } from "next/navigation";

// The AI Tutor has been merged into the main chat: the homepage chat now
// grounds answers in a selected course's materials via the course-context
// selector. This route is kept as a redirect so old links keep working.
export default function StudentTutorPage() {
  redirect("/");
}
