"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  GraduationCap,
  BarChart3,
  Megaphone,
  FolderOpen,
  Users,
  Calendar,
  Settings,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface FacultySidebarProps {
  facultyInfo: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  facultyRecord: {
    id: string;
    position: string;
    departmentId: string;
    officeLocation?: string;
    isActive: boolean;
  } | null;
}

const navigationItems = [
  {
    title: "Overview",
    href: "/faculty",
    icon: LayoutDashboard,
    description: "Dashboard and quick stats"
  },
  {
    title: "My Courses",
    href: "/faculty/courses",
    icon: BookOpen,
    description: "Manage course content and enrollment"
  },
  {
    title: "Assignments",
    href: "/faculty/assignments",
    icon: FileText,
    description: "Create and manage assignments"
  },
  {
    title: "Grade Book",
    href: "/faculty/grades",
    icon: GraduationCap,
    description: "Grade assignments and track progress"
  },
  {
    title: "Students",
    href: "/faculty/students",
    icon: Users,
    description: "View student rosters and performance"
  },
  {
    title: "Analytics",
    href: "/faculty/analytics",
    icon: BarChart3,
    description: "Course performance and insights"
  },
  {
    title: "Announcements",
    href: "/faculty/announcements",
    icon: Megaphone,
    description: "Create course announcements"
  },
  {
    title: "Materials",
    href: "/faculty/materials",
    icon: FolderOpen,
    description: "Upload and organize course materials"
  },
  {
    title: "Schedule",
    href: "/faculty/schedule",
    icon: Calendar,
    description: "View teaching schedule and office hours"
  },
];

const bottomNavItems = [
  {
    title: "Profile",
    href: "/profile",
    icon: User,
    description: "Manage your profile and account settings"
  },
  {
    title: "Settings",
    href: "/faculty/settings",
    icon: Settings,
    description: "Application preferences"
  },
];

export function FacultySidebar({ facultyInfo, facultyRecord }: FacultySidebarProps) {
  const pathname = usePathname();

  const formatPosition = (position: string) => {
    return position
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 border-r bg-background">
      <div className="flex h-full flex-col">
        {/* Faculty Info Card */}
        <Card className="m-4 mb-6">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <User className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {facultyInfo.name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {facultyRecord ? formatPosition(facultyRecord.position) : 'Faculty'}
                </p>
              </div>
            </div>
            {facultyRecord?.officeLocation && (
              <div className="mt-2">
                <Badge variant="outline" className="text-xs">
                  Office: {facultyRecord.officeLocation}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main Navigation */}
        <nav className="flex-1 space-y-1 px-4">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== "/faculty" && pathname.startsWith(item.href));
            
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start h-auto p-3",
                    isActive && "bg-secondary/80"
                  )}
                >
                  <item.icon className="mr-3 h-4 w-4 shrink-0" />
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium">{item.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {item.description}
                    </div>
                  </div>
                </Button>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Navigation */}
        <div className="border-t p-4 space-y-1">
          {bottomNavItems.map((item) => {
            const isActive = pathname === item.href;
            
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className="w-full justify-start"
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.title}
                </Button>
              </Link>
            );
          })}
        </div>

        {/* Status Indicator */}
        <div className="border-t p-4">
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <div className={cn(
              "h-2 w-2 rounded-full",
              facultyRecord?.isActive ? "bg-green-500" : "bg-red-500"
            )} />
            <span>
              {facultyRecord?.isActive ? "Active Faculty" : "Inactive"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}