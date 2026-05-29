"use client";

import { usePathname } from "next/navigation";
import { SidebarProvider } from "ui/sidebar";
import { StudentSidebar } from "./student-sidebar";
import { NotificationBell } from "./notification-bell";

// Redesigned pages that should render full-bleed with no sidebar
const FULL_BLEED_PATHS = ["/student/dashboard"];

interface StudentLayoutShellProps {
  session: any;
  children: React.ReactNode;
}

export function StudentLayoutShell({ session, children }: StudentLayoutShellProps) {
  const pathname = usePathname();
  const isFullBleed = FULL_BLEED_PATHS.includes(pathname);

  if (isFullBleed) {
    // No wrappers — let the page control its own layout and scroll
    return <>{children}</>;
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-background w-screen">
        <StudentSidebar session={session} />
        <main className="flex-1 w-full flex flex-col overflow-hidden">
          <div className="flex items-center justify-end border-b px-6 py-2 shrink-0">
            <NotificationBell />
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
