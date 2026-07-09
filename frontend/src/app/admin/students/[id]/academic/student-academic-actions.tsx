"use client";

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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowDown,
  ArrowUp,
  GraduationCap,
  Loader2,
  Pause,
  Settings,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

interface Props {
  studentId: string;
  currentLevel: number | null;
  currentSemester: string | null;
  academicYear: string | null;
  enrollmentStatus: string | null;
  programId: string | null;
  programs: { id: string; name: string; code: string }[];
}

type OverrideAction = {
  label: string;
  description: string;
  icon: React.ReactNode;
  variant: "default" | "outline" | "destructive" | "secondary";
  payload: Record<string, unknown>;
};

export function StudentAcademicActions({
  studentId,
  currentLevel,
  enrollmentStatus,
  programId,
  programs,
}: Props) {
  const router = useRouter();
  const [executing, setExecuting] = useState<string | null>(null);
  const [selectedProgram, setSelectedProgram] = useState(programId ?? "");

  const executeOverride = async (
    action: string,
    payload: Record<string, unknown>,
  ) => {
    setExecuting(action);
    try {
      const res = await fetch(`/api/admin/students/${studentId}/academic`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error || "Failed to update student");
        return;
      }
      toast.success(data.message || "Student updated successfully");
      router.refresh();
    } catch {
      toast.error("Failed to update student");
    } finally {
      setExecuting(null);
    }
  };

  const level = currentLevel ?? 100;

  const quickActions: OverrideAction[] = [
    {
      label: "Promote Level",
      description: `Advance from ${level}L to ${level + 100}L`,
      icon: <ArrowUp className="h-4 w-4" />,
      variant: "default",
      payload: { currentLevel: level + 100 },
    },
    {
      label: "Demote Level",
      description: `Move back from ${level}L to ${Math.max(100, level - 100)}L`,
      icon: <ArrowDown className="h-4 w-4" />,
      variant: "outline",
      payload: { currentLevel: Math.max(100, level - 100) },
    },
    {
      label: "Mark on Leave",
      description: "Set enrollment status to inactive",
      icon: <Pause className="h-4 w-4" />,
      variant: "secondary",
      payload: { enrollmentStatus: "inactive" },
    },
    {
      label: "Mark Graduated",
      description: "Set enrollment status to graduated",
      icon: <GraduationCap className="h-4 w-4" />,
      variant: "destructive",
      payload: { enrollmentStatus: "graduated" },
    },
  ];

  // Don't show actions that don't make sense
  const filteredActions = quickActions.filter((action) => {
    if (action.label === "Demote Level" && level <= 100) return false;
    if (action.label === "Mark on Leave" && enrollmentStatus === "inactive")
      return false;
    if (action.label === "Mark Graduated" && enrollmentStatus === "graduated")
      return false;
    return true;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Manual Overrides
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick actions */}
        <div className="flex flex-wrap gap-2">
          {filteredActions.map((action) => (
            <AlertDialog key={action.label}>
              <AlertDialogTrigger asChild>
                <Button variant={action.variant} size="sm">
                  {action.icon}
                  <span className="ml-2">{action.label}</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{action.label}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {action.description}. Are you sure you want to proceed?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => {
                      e.preventDefault();
                      executeOverride(action.label, action.payload);
                    }}
                    disabled={executing === action.label}
                  >
                    {executing === action.label ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Confirm"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ))}

          {enrollmentStatus !== "active" && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  Reactivate Student
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reactivate Student</AlertDialogTitle>
                  <AlertDialogDescription>
                    Set enrollment status back to active. Are you sure?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => {
                      e.preventDefault();
                      executeOverride("Reactivate", {
                        enrollmentStatus: "active",
                      });
                    }}
                    disabled={executing === "Reactivate"}
                  >
                    {executing === "Reactivate" ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Confirm"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {/* Change Program */}
        <div className="flex items-center gap-3 pt-3 border-t">
          <span className="text-sm font-medium">Change Program:</span>
          <Select value={selectedProgram} onValueChange={setSelectedProgram}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select program" />
            </SelectTrigger>
            <SelectContent>
              {programs.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            disabled={
              !selectedProgram ||
              selectedProgram === programId ||
              executing === "Change Program"
            }
            onClick={() =>
              executeOverride("Change Program", {
                programId: selectedProgram,
              })
            }
          >
            {executing === "Change Program" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Update"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
