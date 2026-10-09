"use client";
import { SidebarMenuButton, useSidebar } from "ui/sidebar";
import { SidebarMenu, SidebarMenuItem } from "ui/sidebar";
import { SidebarGroupContent } from "ui/sidebar";
import { Tooltip } from "ui/tooltip";

import { CHAT_FIRST, STUDENT_PAGES } from "lib/config/product";
import { Shortcuts, getShortcutKeyList } from "lib/keyboard-shortcuts";
import {
  BookOpenIcon,
  CalendarClockIcon,
  FolderOpenIcon,
  LayersIcon,
  type LucideIcon,
  MessageSquareTextIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MCPIcon } from "ui/mcp-icon";
import { SidebarGroup } from "ui/sidebar";
import { WriteIcon } from "ui/write-icon";

const STUDENT_PAGE_ICONS: Record<
  (typeof STUDENT_PAGES)[number]["href"],
  LucideIcon
> = {
  "/student/courses": BookOpenIcon,
  "/student/deadlines": CalendarClockIcon,
  "/student/flashcards": LayersIcon,
};

export function AppSidebarMenus({ role }: { role?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const isSuperAdmin = role === "super_admin";
  const t = useTranslations("");
  const { setOpenMobile } = useSidebar();

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem className="mb-2">
            <Link
              href="/"
              onClick={(e) => {
                e.preventDefault();
                setOpenMobile(false);
                router.push(`/`);
                router.refresh();
              }}
              className="group/new-chat flex h-10 w-full items-center gap-2.5 rounded-xl border border-sidebar-border bg-card px-3 text-sm font-medium text-foreground shadow-[var(--shadow-soft)] transition-colors hover:bg-secondary"
            >
              <WriteIcon className="size-4" />
              {t("Layout.newChat")}
              <span className="ml-auto flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                {getShortcutKeyList(Shortcuts.openNewChat).map((key) => (
                  <kbd
                    key={key}
                    className="grid h-5 min-w-5 place-items-center rounded-md border bg-secondary px-1 font-sans"
                  >
                    {key}
                  </kbd>
                ))}
              </span>
            </Link>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Link
              href="/"
              onClick={(e) => {
                e.preventDefault();
                setOpenMobile(false);
                router.push(`/`);
                router.refresh();
              }}
            >
              <SidebarMenuButton
                isActive={pathname === "/" || pathname.startsWith("/chat/")}
              >
                <MessageSquareTextIcon className="size-4" />
                Chat
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
        {/* MCP servers are platform-global; only super_admin manages them */}
        {isSuperAdmin && (
          <SidebarMenu>
            <Tooltip>
              <SidebarMenuItem>
                <Link href="/mcp">
                  <SidebarMenuButton className="font-semibold">
                    <MCPIcon className="size-4 fill-accent-foreground" />
                    {t("Layout.mcpConfiguration")}
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            </Tooltip>
          </SidebarMenu>
        )}
        {CHAT_FIRST && role === "student" && (
          <SidebarMenu className="mt-1">
            {STUDENT_PAGES.map(({ title, href }) => {
              const Icon = STUDENT_PAGE_ICONS[href];
              const active =
                pathname === href || pathname.startsWith(`${href}/`);
              return (
                <SidebarMenuItem key={href}>
                  <Link href={href} onClick={() => setOpenMobile(false)}>
                    <SidebarMenuButton isActive={active}>
                      <Icon className="size-4" />
                      {title}
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        )}
        {!CHAT_FIRST && (
          <SidebarMenu>
            <Tooltip>
              <SidebarMenuItem>
                <Link href="/student">
                  <SidebarMenuButton className="font-semibold">
                    <FolderOpenIcon className="size-4" />
                    Student
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            </Tooltip>
          </SidebarMenu>
        )}
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
