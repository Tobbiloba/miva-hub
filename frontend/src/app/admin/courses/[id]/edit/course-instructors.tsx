"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { UserCheck, Plus, Loader2, Trash2 } from "lucide-react";

interface Instructor {
  id: string;
  facultyId: string;
  semester: string;
  role: string;
  createdAt: string;
  facultyName: string;
  facultyEmail: string;
  position: string;
}

interface FacultyOption {
  id: string;
  faculty: { id: string } | null;
  name: string;
  email: string;
}

const roleOptions = [
  { value: "primary", label: "Primary Instructor" },
  { value: "assistant", label: "Teaching Assistant" },
  { value: "lab_instructor", label: "Lab Instructor" },
  { value: "grader", label: "Grader" },
];

const roleLabel = (role: string) =>
  roleOptions.find((r) => r.value === role)?.label ?? role;

export function CourseInstructors({ courseId }: { courseId: string }) {
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [facultyList, setFacultyList] = useState<FacultyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [selectedFaculty, setSelectedFaculty] = useState("");
  const [selectedRole, setSelectedRole] = useState("primary");
  const [semester, setSemester] = useState("");

  const fetchInstructors = async () => {
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/instructors`);
      const data = await res.json();
      if (data.success) setInstructors(data.data);
    } catch {
      toast.error("Failed to load instructors");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstructors();
  }, [courseId]);

  const openDialog = async () => {
    setDialogOpen(true);
    if (facultyList.length === 0) {
      try {
        const res = await fetch("/api/admin/faculty");
        const data = await res.json();
        if (data.success) {
          setFacultyList(data.data);
        }
      } catch {
        toast.error("Failed to load faculty list");
      }
    }
  };

  const handleAssign = async () => {
    if (!selectedFaculty || !semester) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Get the faculty record ID (not the user ID)
    const facultyUser = facultyList.find((f) => f.id === selectedFaculty);
    const facultyId = facultyUser?.faculty?.id;

    if (!facultyId) {
      toast.error("Selected user has no faculty profile");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/instructors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facultyId,
          semester,
          role: selectedRole,
        }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(data.message);
        setDialogOpen(false);
        setSelectedFaculty("");
        setSemester("");
        fetchInstructors();
      } else {
        toast.error(data.error || "Failed to assign faculty");
      }
    } catch {
      toast.error("Failed to assign faculty");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (facultyId: string) => {
    setDeletingId(facultyId);
    try {
      const res = await fetch(
        `/api/admin/courses/${courseId}/instructors/${facultyId}`,
        { method: "DELETE" }
      );
      const data = await res.json();

      if (data.success) {
        toast.success(data.message);
        fetchInstructors();
      } else {
        toast.error(data.error || "Failed to remove faculty");
      }
    } catch {
      toast.error("Failed to remove faculty");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Faculty Assignments
          </CardTitle>
          <CardDescription>
            {instructors.length} instructor
            {instructors.length !== 1 ? "s" : ""} assigned
          </CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Assign Faculty
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Faculty to Course</DialogTitle>
              <DialogDescription>
                Select a faculty member, their role, and the semester.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Faculty Member *</Label>
                <Select
                  value={selectedFaculty}
                  onValueChange={setSelectedFaculty}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select faculty" />
                  </SelectTrigger>
                  <SelectContent>
                    {facultyList.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name} ({f.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Role *</Label>
                  <Select
                    value={selectedRole}
                    onValueChange={setSelectedRole}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roleOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Semester *</Label>
                  <Input
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    placeholder="e.g., first, second"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAssign}
                disabled={submitting || !selectedFaculty || !semester}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  "Assign"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : instructors.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No faculty assigned to this course yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Semester</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {instructors.map((inst) => (
                <TableRow key={inst.id}>
                  <TableCell className="font-medium">
                    {inst.facultyName}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {inst.facultyEmail}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{roleLabel(inst.role)}</Badge>
                  </TableCell>
                  <TableCell className="capitalize">{inst.semester}</TableCell>
                  <TableCell>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-destructive"
                        >
                          {deletingId === inst.facultyId ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Remove Faculty Assignment
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Remove {inst.facultyName} from this course? This
                            only removes the assignment, not the faculty member.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleRemove(inst.facultyId)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
