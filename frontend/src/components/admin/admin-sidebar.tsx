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
import { Session, User } from "better-auth";
import {
  BarChart3,
  BookOpen,
  Bot,
  Building2,
  Calendar,
  Clock,
  CreditCard,
  Database,
  FileText,
  GraduationCap,
  Megaphone,
  PanelLeft,
  Plus,
  Settings,
  Shield,
  ShieldCheck,
  TrendingUp,
  Upload,
  UserCheck,
  Users,
  Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useState } from "react";

const adminRoutes = [
  {
    title: "Dashboard",
    href: "/admin",
    icon: Building2,
  },
  {
    title: "Academic Management",
    icon: BookOpen,
    children: [
      {
        title: "Academic Sessions",
        href: "/admin/academic",
        icon: GraduationCap,
      },
      { title: "Departments", href: "/admin/departments", icon: Building2 },
      { title: "Programs", href: "/admin/programs", icon: FileText },
      { title: "Courses", href: "/admin/courses", icon: BookOpen },
      { title: "Faculty", href: "/admin/faculty", icon: UserCheck },
      { title: "Class Schedule", href: "/admin/schedule", icon: Clock },
      { title: "Academic Calendar", href: "/admin/calendar", icon: Calendar },
    ],
  },
  {
    title: "User Management",
    icon: Shield,
    children: [
      { title: "All Users", href: "/admin/users", icon: Users },
      { title: "Students", href: "/admin/students", icon: GraduationCap },
    ],
  },
  {
    title: "Content & Communications",
    icon: Upload,
    children: [
      { title: "Upload Content", href: "/admin/content/upload", icon: Plus },
      {
        title: "Manage Content",
        href: "/admin/content/manage",
        icon: Database,
      },
      { title: "AI Processing", href: "/admin/processing", icon: Zap },
      {
        title: "Moderation Queue",
        href: "/admin/content/moderation",
        icon: ShieldCheck,
      },
      { title: "Announcements", href: "/admin/announcements", icon: Megaphone },
    ],
  },
  {
    title: "Analytics & Reports",
    icon: BarChart3,
    children: [
      {
        title: "Analytics Dashboard",
        href: "/admin/analytics",
        icon: TrendingUp,
      },
      { title: "Reports Center", href: "/admin/reports", icon: FileText },
      { title: "AI Operations", href: "/admin/ai-operations", icon: Bot },
    ],
  },
  {
    title: "Billing",
    href: "/admin/billing",
    icon: CreditCard,
  },
  {
    title: "System Settings",
    href: "/admin/settings",
    icon: Settings,
  },
];

export function AdminSidebar({
  session,
  isSuperAdmin = false,
}: { session?: { session: Session; user: User }; isSuperAdmin?: boolean }) {
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

  // Platform-level entries shown only to super admins
  const routes = isSuperAdmin
    ? [
        adminRoutes[0],
        {
          title: "Universities",
          href: "/admin/universities",
          icon: Building2,
        },
        ...adminRoutes.slice(1),
      ]
    : adminRoutes;

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
                href="/admin"
                onClick={(e) => {
                  e.preventDefault();
                  router.push("/admin");
                  setOpenMobile(false);
                }}
              >
                <Image
                  src="/logo.png"
                  alt="MIVA Admin"
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
                {routes.map((route) => (
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
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {session?.user?.name || "Admin User"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {session?.user?.email}
              </p>
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
              <UserCheck className="h-3 w-3 mr-1" />
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
