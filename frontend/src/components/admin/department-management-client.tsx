"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Edit, Trash2 } from "lucide-react";

interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
}

interface DepartmentFormData {
  name: string;
  code: string;
  description: string;
}

interface DepartmentManagementClientProps {
  children: React.ReactNode;
  department?: Department;
  mode?: "add" | "edit" | "delete";
}

export function DepartmentManagementClient({ 
  children, 
  department, 
  mode = "add" 
}: DepartmentManagementClientProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<DepartmentFormData>({
    name: department?.name || "",
    code: department?.code || "",
    description: department?.description || "",
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const url = mode === "edit" && department?.id 
        ? `/api/admin/departments/${department.id}`
        : "/api/admin/departments";
        
      const method = mode === "edit" ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: mode === "edit" ? "Department Updated" : "Department Created",
          description: `${formData.name} has been ${mode === "edit" ? "updated" : "created"} successfully.`,
        });
        
        setIsOpen(false);
        
        // Reset form for add mode
        if (mode === "add") {
          setFormData({ name: "", code: "", description: "" });
        }
        
        // Refresh the page to show updated data
        window.location.reload();
      } else {
        throw new Error(result.error || "Operation failed");
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

  const handleDelete = async () => {
    if (!department?.id) return;
    
    setIsLoading(true);
    
    try {
      const response = await fetch(`/api/admin/departments/${department.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Department Deleted",
          description: `${department.name} has been deleted successfully.`,
        });
        
        // Refresh the page to show updated data
        window.location.reload();
      } else {
        throw new Error(result.error || "Delete failed");
      }
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Failed to delete department",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof DepartmentFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Delete confirmation dialog
  if (mode === "delete") {
    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          {children}
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the{" "}
              <strong>{department?.name}</strong> department and remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Department"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // Add/Edit dialog
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === "edit" ? (
              <>
                <Edit className="h-5 w-5" />
                Edit Department
              </>
            ) : (
              <>
                <Plus className="h-5 w-5" />
                Add New Department
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {mode === "edit" 
              ? "Update the department information below."
              : "Fill in the details to create a new academic department."
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Department Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="e.g., Computer Science"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Department Code *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => handleInputChange("code", e.target.value.toUpperCase())}
                placeholder="e.g., CS"
                maxLength={10}
                required
              />
              <p className="text-xs text-muted-foreground">
                Unique code used for course prefixes (automatically converted to uppercase)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="Brief description of the department..."
                rows={3}
              />
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
                  {mode === "edit" ? "Updating..." : "Creating..."}
                </>
              ) : (
                mode === "edit" ? "Update Department" : "Create Department"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Convenience components for different modes
export function AddDepartmentDialog({ children }: { children: React.ReactNode }) {
  return (
    <DepartmentManagementClient mode="add">
      {children}
    </DepartmentManagementClient>
  );
}

export function EditDepartmentDialog({ 
  children, 
  department 
}: { 
  children: React.ReactNode;
  department: Department;
}) {
  return (
    <DepartmentManagementClient mode="edit" department={department}>
      {children}
    </DepartmentManagementClient>
  );
}

export function DeleteDepartmentDialog({ 
  children, 
  department 
}: { 
  children: React.ReactNode;
  department: Department;
}) {
  return (
    <DepartmentManagementClient mode="delete" department={department}>
      {children}
    </DepartmentManagementClient>
  );
}