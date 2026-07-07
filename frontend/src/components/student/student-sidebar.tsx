"use client";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { getAcademicYear, getStudentId } from "@/lib/auth/user-utils";
import { User as AuthUser, Session } from "better-auth";
import {
  Award,
  BarChart3,
  Bell,
  BookOpen,
  Calendar,
  CalendarDays,
  CreditCard,
  FileText,
  FolderOpen,
  GraduationCap,
  Home,
  Layers,
  type LucideIcon,
  Mic,
  PanelLeft,
  Settings,
  TrendingUp,
  User,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useState } from "react";

type StudentRoute = {
  title: string;
  href: string;
  icon: LucideIcon;
  children?: { title: string; href: string; icon: LucideIcon }[];
};

const studentRoutes: StudentRoute[] = [
  {
    title: "Dashboard",
    href: "/student",
    icon: Home,
  },
  {
    title: "My Courses",
    href: "/student/courses",
    icon: BookOpen,
  },
  {
    title: "AI Tutor",
    href: "/student/tutor",
    icon: GraduationCap,
  },
  {
    title: "Viva Coach",
    href: "/student/viva",
    icon: Mic,
  },
  {
    title: "Assignments",
    href: "/student/assignments",
    icon: FileText,
  },
  {
    title: "Materials",
    href: "/student/materials",
    icon: FolderOpen,
  },
  {
    title: "Schedule",
    href: "/student/schedule",
    icon: Calendar,
  },
  {
    title: "Announcements",
    href: "/student/announcements",
    icon: Bell,
  },
  {
    title: "Faculty",
    href: "/student/faculty",
    icon: Users,
  },
  {
    title: "Calendar",
    href: "/student/calendar",
    icon: CalendarDays,
  },
  {
    title: "Flashcards",
    href: "/student/flashcards",
    icon: Layers,
  },
  {
    title: "Progress",
    href: "/student/progress",
    icon: TrendingUp,
  },
  {
    title: "Notifications",
    href: "/student/notifications",
    icon: Bell,
  },
  {
    title: "Grades",
    href: "/student/grades",
    icon: Award,
  },
  {
    title: "Performance",
    href: "/student/dashboard",
    icon: BarChart3,
  },
  {
    title: "Billing",
    href: "/billing",
    icon: CreditCard,
  },
  {
    title: "My Profile",
    href: "/profile",
    icon: Settings,
  },
];

export function StudentSidebar({
  session,
}: { session?: { session: Session; user: AuthUser } }) {
  const { setOpenMobile } = useSidebar();
  const router = useRouter();
  const pathname = usePathname();
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);

  const toggleMenu = useCallback((title: string) => {
    setExpandedMenus((prev) =>
      prev.includes(title)
        ? prev.filter((item) => item !== title)
        : [...prev, title],
    );
  }, []);

  const isActiveRoute = (href: string) => {
    return pathname === href || pathname.startsWith(href + "/");
  };

  // Get student info
  const studentInfo = session?.user
    ? {
        name: session.user.name,
        email: session.user.email,
        studentId: getStudentId(session.user),
        academicYear: getAcademicYear(session.user),
      }
    : null;

  return (
    <Sidebar
      collapsible="offcanvas"
      className="border-r border-sidebar-border/80"
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-0.5">
            <SidebarMenuButton asChild className="hover:bg-transparent px-2">
              <Link
                href="/student"
                onClick={(e) => {
                  e.preventDefault();
                  router.push("/student");
                  setOpenMobile(false);
                }}
              >
                <Image
                  src="/logo.png"
                  alt="MIVA Student"
                  width={32}
                  height={32}
                  className="h-8 w-8 object-contain"
                  priority
                />
                <div
                  className="ml-auto block sm:hidden"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setOpenMobile(false);
                  }}
                >
                  <PanelLeft className="size-4" />
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="mt-2 overflow-hidden relative">
        <div className="flex flex-col overflow-y-auto">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {studentRoutes.map((route) => (
                  <SidebarMenuItem key={route.title}>
                    {route.children ? (
                      <>
                        <SidebarMenuButton
                          onClick={() => toggleMenu(route.title)}
                          className={`font-semibold ${
                            expandedMenus.includes(route.title)
                              ? "bg-accent"
                              : ""
                          }`}
                        >
                          <route.icon className="size-4" />
                          {route.title}
                        </SidebarMenuButton>
                        {expandedMenus.includes(route.title) && (
                          <SidebarMenuSub>
                            {route.children.map((child) => (
                              <SidebarMenuSubItem key={child.href}>
                                <SidebarMenuSubButton
                                  asChild
                                  className={
                                    isActiveRoute(child.href) ? "bg-accent" : ""
                                  }
                                >
                                  <Link
                                    href={child.href}
                                    onClick={() => setOpenMobile(false)}
                                  >
                                    <child.icon className="size-4" />
                                    {child.title}
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        )}
                      </>
                    ) : (
                      <SidebarMenuButton
                        asChild
                        className={`font-semibold ${
                          isActiveRoute(route.href!) ? "bg-accent" : ""
                        }`}
                      >
                        <Link
                          href={route.href!}
                          onClick={() => setOpenMobile(false)}
                        >
                          <route.icon className="size-4" />
                          {route.title}
                        </Link>
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </div>
      </SidebarContent>

      <SidebarFooter className="flex flex-col items-stretch space-y-2">
        <div className="p-4 border-t border-sidebar-border/40">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <User className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {studentInfo?.name || "Student"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {studentInfo?.studentId || studentInfo?.email}
              </p>
              {studentInfo?.academicYear && (
                <p className="text-xs text-muted-foreground">
                  {studentInfo.academicYear}
                </p>
              )}
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => {
                router.push("/profile");
                setOpenMobile(false);
              }}
            >
              <Settings className="h-3 w-3 mr-1" />
              Profile
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => {
                router.push("/");
                setOpenMobile(false);
              }}
            >
              Main Site
            </Button>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
