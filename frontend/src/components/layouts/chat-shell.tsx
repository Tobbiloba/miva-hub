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
  const isCollapsed =
    cookieStore.get(COOKIE_KEY_SIDEBAR_STATE)?.value !== "true";
  return (
    <SidebarProvider defaultOpen={!isCollapsed}>
      <SWRConfigProvider>
        <ToolsInfoDrawerProvider>
          <AppPopupProvider />
          <AppSidebar session={session} />
          <main className="relative bg-background  w-full flex flex-col h-screen">
            <AppHeader />
            <div className="flex-1 overflow-y-auto">{children}</div>
          </main>
        </ToolsInfoDrawerProvider>
      </SWRConfigProvider>
    </SidebarProvider>
  );
}
