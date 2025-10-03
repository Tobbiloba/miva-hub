"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Users, Mail, GraduationCap, Hash } from "lucide-react";

interface StudentFormData {
  name: string;
  email: string;
  studentId: string;
  academicYear: string;
  enrollmentStatus: string;
}

interface StudentManagementClientProps {
  children: React.ReactNode;
}

export function StudentManagementClient({ children }: StudentManagementClientProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<StudentFormData>({
    name: "",
    email: "",
    studentId: "",
    academicYear: "100",
    enrollmentStatus: "active",
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate email format
      if (!formData.email.endsWith('@miva.edu.ng')) {
        throw new Error('Email must be a valid MIVA University email (@miva.edu.ng)');
      }

      const response = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Student Added",
          description: `${formData.name} has been successfully registered.`,
        });
        
        setIsOpen(false);
        setFormData({
          name: "",
          email: "",
          studentId: "",
          academicYear: "100",
          enrollmentStatus: "active",
        });
        
        // Refresh the page to show updated data
        window.location.reload();
      } else {
        throw new Error(result.error || "Failed to add student");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof StudentFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const generateStudentId = () => {
    // Generate MIVA student ID format: MIVA/2024/0001
    const year = new Date().getFullYear();
    const randomNum = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    const studentId = `MIVA/${year}/${randomNum}`;
    setFormData(prev => ({ ...prev, studentId }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New Student
          </DialogTitle>
          <DialogDescription>
            Register a new student in the MIVA University system.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 py-4">
            {/* Student Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Full Name *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="e.g., John Doe Adebayo"
                required
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                MIVA Email *
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="john.adebayo@miva.edu.ng"
                required
              />
              <p className="text-xs text-muted-foreground">
                Must be a valid MIVA University email address
              </p>
            </div>

            {/* Student ID */}
            <div className="space-y-2">
              <Label htmlFor="studentId" className="flex items-center gap-2">
                <Hash className="h-4 w-4" />
                Student ID *
              </Label>
              <div className="flex gap-2">
                <Input
                  id="studentId"
                  value={formData.studentId}
                  onChange={(e) => handleInputChange("studentId", e.target.value)}
                  placeholder="MIVA/2024/0001"
                  required
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={generateStudentId}
                  className="shrink-0"
                >
                  Generate
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Format: MIVA/YEAR/NUMBER (e.g., MIVA/2024/0001)
              </p>
            </div>

            {/* Academic Year */}
            <div className="space-y-2">
              <Label htmlFor="academicYear" className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                Academic Year *
              </Label>
              <Select value={formData.academicYear} onValueChange={(value) => handleInputChange("academicYear", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select academic year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="100">100 Level (Freshman)</SelectItem>
                  <SelectItem value="200">200 Level (Sophomore)</SelectItem>
                  <SelectItem value="300">300 Level (Junior)</SelectItem>
                  <SelectItem value="400">400 Level (Senior)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Enrollment Status */}
            <div className="space-y-2">
              <Label htmlFor="enrollmentStatus">Enrollment Status *</Label>
              <Select value={formData.enrollmentStatus} onValueChange={(value) => handleInputChange("enrollmentStatus", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select enrollment status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="graduated">Graduated</SelectItem>
                  <SelectItem value="transferred">Transferred</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registering...
                </>
              ) : (
                "Register Student"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}