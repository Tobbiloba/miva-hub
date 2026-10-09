import { SWRConfigProvider } from "@/app/(chat)/swr-config";
import { AppHeader } from "@/components/layouts/app-header";
import { AppPopupProvider } from "@/components/layouts/app-popup-provider";
import { AppSidebar } from "@/components/layouts/app-sidebar";
import { ToolsInfoDrawerProvider } from "@/components/layouts/tools-info-drawer-provider";
import type { Session, User } from "better-auth";
import { COOKIE_KEY_SIDEBAR_STATE } from "lib/const";
import { cookies } from "next/headers";
import { SidebarProvider } from "ui/sidebar";

/**
 * The app frame: sidebar (new chat, study pages, threads) + header. Shared by
 * the chat and the student pages so a student stays in one product.
 */
export async function ChatShell({
  session,
  children,
}: {
  session?: { session: Session; user: User };
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  // Open by default; only a stored "false" (the user closed it) collapses it.
  const isCollapsed =
    cookieStore.get(COOKIE_KEY_SIDEBAR_STATE)?.value === "false";
  return (
    <SidebarProvider defaultOpen={!isCollapsed}>
      <SWRConfigProvider>
        <ToolsInfoDrawerProvider>
          <AppPopupProvider />
          <AppSidebar session={session} />
          {/* The work area fills everything right of the sidebar, edge to edge */}
          <main className="relative flex h-svh w-full min-w-0 flex-col bg-surface">
            <AppHeader />
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto">{children}</div>
            </div>
          </main>
        </ToolsInfoDrawerProvider>
      </SWRConfigProvider>
    </SidebarProvider>
  );
}
