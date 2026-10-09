import { ChatShell } from "@/components/layouts/chat-shell";
import { StudentLayoutShell } from "@/components/student/student-layout-shell";
import { SupportWidget } from "@/components/support/support-widget";
import { getSession } from "@/lib/auth/server";
import { isActiveStudent } from "@/lib/auth/student";
import { getBillingStatus } from "@/lib/billing/status";
import { CHAT_FIRST } from "@/lib/config/product";
import { redirect } from "next/navigation";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let session;

  try {
    session = await getSession();
  } catch {
    redirect("/sign-in");
  }

  // Check if user is an active student
  if (!isActiveStudent(session)) {
    if (session?.user) redirect("/");
    redirect("/sign-in");
  }

  // Paywall check: redirect paywalled students to /billing
  if (session.user.role === "student") {
    const billing = await getBillingStatus(session.user.id);
    if (billing.paywalled) {
      redirect("/billing");
    }
  }

  // Chat-first: the study pages live inside the chat's frame, so a student
  // moves between chat, courses, deadlines and flashcards in one product.
  if (CHAT_FIRST) {
    return (
      <ChatShell session={session}>
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
          {children}
        </div>
        <SupportWidget />
      </ChatShell>
    );
  }

  return (
    <StudentLayoutShell session={session}>
      {children}
      <SupportWidget />
    </StudentLayoutShell>
  );
}
