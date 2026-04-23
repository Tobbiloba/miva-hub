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
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Calendar, Plus, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";

interface Schedule {
  id: string;
  courseId: string;
  courseCode: string;
  courseTitle: string;
  semester: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  roomLocation: string | null;
  buildingName: string | null;
  classType: string;
}

interface Course {
  id: string;
  courseCode: string;
  title: string;
}

const dayLabels: Record<string, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

const dayOptions = [
  { value: "all", label: "All Days" },
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
];

const classTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    lecture: "Lecture",
    lab: "Lab",
    tutorial: "Tutorial",
    seminar: "Seminar",
  };
  return labels[type] ?? type;
};

export default function ScheduleListPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterCourse, setFilterCourse] = useState("all");
  const [filterDay, setFilterDay] = useState("all");
  const { toast } = useToast();

  const fetchSchedules = async () => {
    try {
      const params = new URLSearchParams();
      if (filterCourse !== "all") params.set("courseId", filterCourse);
      if (filterDay !== "all") params.set("dayOfWeek", filterDay);

      const res = await fetch(`/api/admin/schedule?${params}`);
      const data = await res.json();
      if (data.success) setSchedules(data.data);
    } catch {
      toast({ title: "Error", description: "Failed to load schedules", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch courses for filter dropdown
    fetch("/api/admin/courses")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setCourses(data.data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchSchedules();
  }, [filterCourse, filterDay]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/schedule/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (data.success) {
        toast({ title: "Success", description: data.message });
        setSchedules((prev) => prev.filter((s) => s.id !== id));
      } else {
        toast({ title: "Error", description: data.error || "Failed to delete", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to delete schedule", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-8 w-8 text-blue-600" />
            Class Schedule
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage weekly class schedules for all courses
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/schedule/create">
            <Plus className="mr-2 h-4 w-4" />
            Create Schedule
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Select
                value={filterCourse}
                onValueChange={setFilterCourse}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by course" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.courseCode} - {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <Select value={filterDay} onValueChange={setFilterDay}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by day" />
                </SelectTrigger>
                <SelectContent>
                  {dayOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedule Table */}
      <Card>
        <CardHeader>
          <CardTitle>Schedules</CardTitle>
          <CardDescription>
            {schedules.length} schedule{schedules.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : schedules.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Schedules Found</h3>
              <p className="text-muted-foreground mb-4">
                No class schedules have been created yet.
              </p>
              <Button asChild>
                <Link href="/admin/schedule/create">
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Schedule
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Day</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Semester</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div>
                        <span className="font-mono font-medium">
                          {s.courseCode}
                        </span>
                        <p className="text-sm text-muted-foreground">
                          {s.courseTitle}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{dayLabels[s.dayOfWeek] ?? s.dayOfWeek}</TableCell>
                    <TableCell>
                      {s.startTime} - {s.endTime}
                    </TableCell>
                    <TableCell>
                      {s.roomLocation ?? "—"}
                      {s.buildingName && (
                        <span className="text-sm text-muted-foreground">
                          {" "}
                          ({s.buildingName})
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {classTypeLabel(s.classType)}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">{s.semester}</TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-destructive"
                          >
                            {deletingId === s.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Delete Schedule
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Delete the {dayLabels[s.dayOfWeek]} {s.startTime}-
                              {s.endTime} schedule for {s.courseCode}?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(s.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
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
    </div>
  );
}
