"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, ArrowLeft, Calendar, Loader2, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Department {
  id: string;
  name: string;
  code: string;
}

interface FormData {
  title: string;
  description: string;
  eventType: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  location: string;
  priority: string;
  status: string;
  affectedUsers: string;
  departmentId: string;
  remindersEnabled: boolean;
}

const initialFormData: FormData = {
  title: "",
  description: "",
  eventType: "academic",
  startDate: "",
  endDate: "",
  startTime: "",
  endTime: "",
  isAllDay: false,
  location: "",
  priority: "medium",
  status: "scheduled",
  affectedUsers: "all",
  departmentId: "",
  remindersEnabled: true,
};

const eventTypeOptions = [
  { value: "academic", label: "Academic" },
  { value: "registration", label: "Registration" },
  { value: "exam", label: "Examination" },
  { value: "holiday", label: "Holiday" },
  { value: "professional", label: "Professional Development" },
  { value: "ceremony", label: "Ceremony" },
  { value: "maintenance", label: "Maintenance" },
];

const priorityOptions = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const statusOptions = [
  { value: "scheduled", label: "Scheduled" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "postponed", label: "Postponed" },
];

const affectedUsersOptions = [
  { value: "all", label: "All Users" },
  { value: "students", label: "Students" },
  { value: "faculty", label: "Faculty" },
  { value: "staff", label: "Staff" },
  { value: "specific", label: "Specific Group" },
];

export default function CreateCalendarEventPage() {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>(
    {},
  );
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const res = await fetch("/api/admin/departments");
        const data = await res.json();
        if (data.success) setDepartments(data.data);
      } catch (error) {
        console.error("Error fetching departments:", error);
      } finally {
        setIsLoadingOptions(false);
      }
    };
    fetchOptions();
  }, []);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    }

    if (!formData.eventType) {
      newErrors.eventType = "Event type is required";
    }

    if (!formData.startDate) {
      newErrors.startDate = "Start date is required";
    }

    if (!formData.endDate) {
      newErrors.endDate = "End date is required";
    }

    if (
      formData.startDate &&
      formData.endDate &&
      formData.endDate < formData.startDate
    ) {
      newErrors.endDate = "End date must be on or after start date";
    }

    if (!formData.isAllDay && formData.startTime && formData.endTime) {
      if (
        formData.startDate === formData.endDate &&
        formData.endTime <= formData.startTime
      ) {
        newErrors.endTime = "End time must be after start time on the same day";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (
    field: keyof FormData,
    value: string | boolean,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const body: Record<string, unknown> = {
        title: formData.title,
        eventType: formData.eventType,
        startDate: formData.startDate,
        endDate: formData.endDate,
        isAllDay: formData.isAllDay,
        priority: formData.priority,
        status: formData.status,
        affectedUsers: formData.affectedUsers,
        remindersEnabled: formData.remindersEnabled,
      };

      if (formData.description) body.description = formData.description;
      if (formData.location) body.location = formData.location;
      if (!formData.isAllDay && formData.startTime)
        body.startTime = formData.startTime;
      if (!formData.isAllDay && formData.endTime)
        body.endTime = formData.endTime;
      if (formData.affectedUsers === "specific" && formData.departmentId) {
        body.departmentId = formData.departmentId;
      }

      const response = await fetch("/api/admin/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.success) {
        toast({ title: "Success", description: data.message });
        router.push("/admin/calendar");
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to create event",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating calendar event:", error);
      toast({
        title: "Error",
        description: "Failed to create event. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingOptions) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/calendar">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Calendar
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-8 w-8 text-blue-600" />
            Create Calendar Event
          </h1>
          <p className="text-muted-foreground mt-1">
            Add a new event to the academic calendar
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Event Information</CardTitle>
          <CardDescription>
            Enter the details for the new calendar event
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Event Type and Title */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="eventType">Event Type *</Label>
                <Select
                  value={formData.eventType}
                  onValueChange={(value) =>
                    handleInputChange("eventType", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypeOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.eventType && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.eventType}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) =>
                    handleInputChange("priority", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {priorityOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="e.g., First Semester Examinations"
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
              />
              {errors.title && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.title}
                </p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Event description and additional details"
                rows={3}
                value={formData.description}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
              />
            </div>

            {/* All Day checkbox */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isAllDay"
                checked={formData.isAllDay}
                onCheckedChange={(checked) =>
                  handleInputChange("isAllDay", !!checked)
                }
              />
              <Label htmlFor="isAllDay">All day event</Label>
            </div>

            {/* Dates */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) =>
                    handleInputChange("startDate", e.target.value)
                  }
                />
                {errors.startDate && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.startDate}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">End Date *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleInputChange("endDate", e.target.value)}
                />
                {errors.endDate && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.endDate}
                  </p>
                )}
              </div>
            </div>

            {/* Times (hidden when all-day) */}
            {!formData.isAllDay && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) =>
                      handleInputChange("startTime", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) =>
                      handleInputChange("endTime", e.target.value)
                    }
                  />
                  {errors.endTime && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.endTime}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="e.g., Main Auditorium, Room A-204"
                value={formData.location}
                onChange={(e) => handleInputChange("location", e.target.value)}
              />
            </div>

            {/* Status and Affected Users */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleInputChange("status", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="affectedUsers">Affected Users</Label>
                <Select
                  value={formData.affectedUsers}
                  onValueChange={(value) => {
                    handleInputChange("affectedUsers", value);
                    if (value !== "specific")
                      setFormData((prev) => ({ ...prev, departmentId: "" }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select affected users" />
                  </SelectTrigger>
                  <SelectContent>
                    {affectedUsersOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Conditional: Department for specific group */}
            {formData.affectedUsers === "specific" && (
              <div className="space-y-2">
                <Label htmlFor="departmentId">Department</Label>
                <Select
                  value={formData.departmentId}
                  onValueChange={(value) =>
                    handleInputChange("departmentId", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.code} - {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Reminders */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="remindersEnabled"
                checked={formData.remindersEnabled}
                onCheckedChange={(checked) =>
                  handleInputChange("remindersEnabled", !!checked)
                }
              />
              <Label htmlFor="remindersEnabled">
                Enable reminders for this event
              </Label>
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-4 pt-4 border-t">
              <Link href="/admin/calendar">
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Create Event
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
