import { StudentSidebar } from "@/components/student/student-sidebar";
import { getSession } from "@/lib/auth/server";
import { isActiveStudent } from "@/lib/auth/student";
import { redirect } from "next/navigation";
import { SidebarProvider } from "ui/sidebar";
import { SubscriptionGuard } from "@/components/layouts/subscription-guard";

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
  // if (!isActiveStudent(session)) {
  //   // If user has a session but is not a student, redirect to main app
  //   if (session?.user) {
  //     redirect("/");
  //   }
  //   // No session, redirect to sign-in
  //   redirect("/sign-in");
  // }

  return (
    <SubscriptionGuard>
      <SidebarProvider>
        <div className="flex h-screen bg-background w-screen">
          <StudentSidebar session={session} />
          <main className="flex-1 w-full flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6">
              {/* <div className="container mx-auto p-6"> */}
                {children}
              {/* </div> */}
            </div>
          </main>
        </div>
      </SidebarProvider>
    </SubscriptionGuard>
  );
}