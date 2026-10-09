"use client";
import { AsklyLogo } from "@/components/ui/logo-box";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
} from "ui/sidebar";

import { AppSidebarAgents } from "./app-sidebar-agents";
import { AppSidebarMenus } from "./app-sidebar-menus";
import { AppSidebarThreads } from "./app-sidebar-threads";

import { useIsMobile } from "@/hooks/use-mobile";
import { Session, User } from "better-auth";
import { Shortcuts, isShortcutEvent } from "lib/keyboard-shortcuts";
import { PanelLeft } from "lucide-react";
import { AppSidebarUser } from "./app-sidebar-user";

export function AppSidebar({
  session,
}: { session?: { session: Session; user: User } }) {
  const { toggleSidebar, setOpenMobile } = useSidebar();
  const router = useRouter();
  const isMobile = useIsMobile();

  const currentPath = usePathname();
  const role = (session?.user as { role?: string } | undefined)?.role;

  // global shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isShortcutEvent(e, Shortcuts.openNewChat)) {
        e.preventDefault();
        router.push("/");
        router.refresh();
      }
      if (isShortcutEvent(e, Shortcuts.toggleSidebar)) {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router, toggleSidebar]);

  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [currentPath, isMobile]);

  return (
    <Sidebar collapsible="offcanvas" className="border-r-0">
      <SidebarHeader className="px-3 pt-3.5 pb-1">
        <SidebarMenu>
          <SidebarMenuItem className="flex h-9 items-center justify-between pl-1.5">
            <Link
              href="/"
              className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={(e) => {
                e.preventDefault();
                router.push("/");
                router.refresh();
              }}
            >
              <AsklyLogo />
            </Link>
            <button
              type="button"
              aria-label="Close sidebar"
              onClick={() =>
                isMobile ? setOpenMobile(false) : toggleSidebar()
              }
              className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
            >
              <PanelLeft className="size-[18px]" />
            </button>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="relative overflow-hidden px-1.5">
        <div className="flex flex-col overflow-y-auto [scrollbar-width:none]">
          <AppSidebarMenus role={role} />
          {/* Agents are a power-user feature; students get the study pages */}
          {role !== "student" && <AppSidebarAgents />}
          <AppSidebarThreads />
        </div>
      </SidebarContent>
      <SidebarFooter className="p-2">
        <AppSidebarUser session={session} />
      </SidebarFooter>
    </Sidebar>
  );
}
