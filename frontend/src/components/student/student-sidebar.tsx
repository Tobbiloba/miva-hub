"use client";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import {
  BookOpen,
  Calendar,
  GraduationCap,
  Home,
  FileText,
  BarChart3,
  Brain,
  Award,
  PanelLeft,
  User,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Session, User as AuthUser } from "better-auth";
import { getStudentId, getAcademicYear } from "@/lib/auth/user-utils";

const studentRoutes = [
  {
    title: "Dashboard",
    href: "/student",
    icon: Home,
  },
  {
    title: "My Courses",
    icon: BookOpen,
    children: [
      { title: "Current Courses", href: "/student/courses", icon: BookOpen },
      { title: "Course Registration", href: "/student/registration", icon: FileText },
    ],
  },
  {
    title: "Assignments",
    href: "/student/assignments",
    icon: FileText,
  },
  {
    title: "Grades",
    href: "/student/grades", 
    icon: Award,
  },
  {
    title: "Calendar",
    href: "/student/calendar",
    icon: Calendar,
  },
  {
    title: "Study Buddy",
    href: "/student/study",
    icon: Brain,
  },
  {
    title: "Academic Progress",
    href: "/student/progress",
    icon: BarChart3,
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
        : [...prev, title]
    );
  }, []);

  const isActiveRoute = (href: string) => {
    return pathname === href || pathname.startsWith(href + "/");
  };

  // Get student info
  const studentInfo = session?.user ? {
    name: session.user.name,
    email: session.user.email,
    studentId: getStudentId(session.user),
    academicYear: getAcademicYear(session.user),
  } : null;

  return (
    <Sidebar
      collapsible="offcanvas"
      className="border-r border-sidebar-border/80"
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-0.5">
            <SidebarMenuButton asChild className="hover:bg-transparent">
              <Link
                href="/student"
                onClick={(e) => {
                  e.preventDefault();
                  router.push("/student");
                  setOpenMobile(false);
                }}
              >
                <GraduationCap className="size-5" />
                <h4 className="font-bold">MIVA Student</h4>
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
                            expandedMenus.includes(route.title) ? "bg-accent" : ""
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