"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Settings,
  LogOut,
  Bell,
  Search,
  GraduationCap,
  Menu,
  Home,
} from "lucide-react";
import { Input } from "@/components/ui/input";

interface FacultyHeaderProps {
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

export function FacultyHeader({ facultyInfo, facultyRecord }: FacultyHeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const formatPosition = (position: string) => {
    return position
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement search functionality
    console.log("Searching for:", searchQuery);
  };

  return (
    <header className="fixed top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center px-6">
        {/* Logo and Branding */}
        <div className="flex items-center space-x-3 mr-8">
          <Link href="/faculty" className="flex items-center">
            <Image
              src="/logo.png"
              alt="MIVA Faculty"
              width={32}
              height={32}
              className="h-8 w-8 object-contain"
              priority
            />
          </Link>
          <Badge variant="secondary" className="text-xs">
            {facultyRecord ? formatPosition(facultyRecord.position) : 'Faculty'}
          </Badge>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex-1 max-w-lg mr-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search students, courses, assignments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
        </form>

        {/* Action Buttons */}
        <div className="flex items-center space-x-4">
          {/* Quick Actions */}
          <div className="hidden md:flex items-center space-x-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/faculty/assignments/create">
                + Assignment
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/faculty/announcements/create">
                + Announcement
              </Link>
            </Button>
          </div>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {/* Notification badge - TODO: make dynamic */}
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-xs text-white flex items-center justify-center">
                  3
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="p-2">
                <h3 className="font-semibold mb-2">Recent Notifications</h3>
                {/* TODO: Add real notifications */}
                <div className="space-y-2">
                  <div className="p-2 text-sm border rounded">
                    <p className="font-medium">New assignment submission</p>
                    <p className="text-muted-foreground">John Doe submitted CS101 Assignment 1</p>
                  </div>
                  <div className="p-2 text-sm border rounded">
                    <p className="font-medium">Grading reminder</p>
                    <p className="text-muted-foreground">5 assignments pending grade</p>
                  </div>
                  <div className="p-2 text-sm border rounded">
                    <p className="font-medium">Course enrollment</p>
                    <p className="text-muted-foreground">3 new students enrolled in MATH201</p>
                  </div>
                </div>
                <Button variant="outline" className="w-full mt-2" size="sm">
                  View All Notifications
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Navigation Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/" className="flex items-center">
                  <Home className="mr-2 h-4 w-4" />
                  Main Portal
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/student" className="flex items-center">
                  <GraduationCap className="mr-2 h-4 w-4" />
                  Student View
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                Help & Support
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Profile Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2 px-3">
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                  <User className="h-4 w-4" />
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium">{facultyInfo.name}</p>
                  <p className="text-xs text-muted-foreground">{facultyInfo.email}</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="p-2">
                <p className="text-sm font-medium">{facultyInfo.name}</p>
                <p className="text-xs text-muted-foreground">{facultyInfo.email}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {facultyRecord ? formatPosition(facultyRecord.position) : 'Faculty Member'}
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/faculty/profile" className="flex items-center">
                  <User className="mr-2 h-4 w-4" />
                  Profile Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/faculty/settings" className="flex items-center">
                  <Settings className="mr-2 h-4 w-4" />
                  Preferences
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}