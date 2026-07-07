import { getSession } from "@/lib/auth/server";
import { isActiveStudent } from "@/lib/auth/student";
import { redirect } from "next/navigation";
import { StudentLayoutShell } from "@/components/student/student-layout-shell";
import { SupportWidget } from "@/components/support/support-widget";
import { getBillingStatus } from "@/lib/billing/status";

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

  return (
    <StudentLayoutShell session={session}>
      {children}
      <SupportWidget />
    </StudentLayoutShell>
  );
}