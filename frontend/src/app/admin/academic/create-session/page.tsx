"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

const createSessionSchema = z.object({
  sessionName: z
    .string()
    .trim()
    .min(1, "Session name is required")
    .max(50, "Session name too long"),
  currentSemester: z.enum(["first", "second"]),
  firstSemStart: z.string().optional(),
  firstSemEnd: z.string().optional(),
  secondSemStart: z.string().optional(),
  secondSemEnd: z.string().optional(),
  isCurrent: z.boolean(),
  status: z.enum(["upcoming", "active", "closed"]),
});

export default function CreateSessionPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    sessionName: "",
    currentSemester: "first" as "first" | "second",
    firstSemStart: "",
    firstSemEnd: "",
    secondSemStart: "",
    secondSemEnd: "",
    isCurrent: false,
    status: "upcoming" as "upcoming" | "active" | "closed",
  });

  const updateField = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = createSessionSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0]?.toString() ?? "form";
        fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        sessionName: form.sessionName,
        currentSemester: form.currentSemester,
        isCurrent: form.isCurrent,
        status: form.status,
      };
      if (form.firstSemStart) body.firstSemStart = form.firstSemStart;
      if (form.firstSemEnd) body.firstSemEnd = form.firstSemEnd;
      if (form.secondSemStart) body.secondSemStart = form.secondSemStart;
      if (form.secondSemEnd) body.secondSemEnd = form.secondSemEnd;

      const res = await fetch("/api/admin/academic/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!data.success) {
        if (data.details) {
          const fieldErrors: Record<string, string> = {};
          for (const d of data.details) {
            fieldErrors[d.path?.[0] ?? "form"] = d.message;
          }
          setErrors(fieldErrors);
        } else {
          toast.error(data.error || "Failed to create session");
        }
        return;
      }

      toast.success(data.message || "Session created successfully");
      router.push("/admin/academic");
    } catch {
      toast.error("Failed to create session");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/academic">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Create Academic Session
          </h1>
          <p className="text-muted-foreground">
            Set up a new academic session with semester dates
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Session Details</CardTitle>
          <CardDescription>
            Enter a session name (e.g. 2025/2026, 2023 Cohort, or Fall 2025)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Session Name */}
            <div className="space-y-2">
              <Label htmlFor="sessionName">
                Session Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="sessionName"
                value={form.sessionName}
                onChange={(e) => updateField("sessionName", e.target.value)}
                placeholder="2023 Cohort"
                autoComplete="off"
              />
              {errors.sessionName && (
                <p className="text-sm text-destructive">{errors.sessionName}</p>
              )}
            </div>

            {/* Starting Semester */}
            <div className="space-y-2">
              <Label htmlFor="currentSemester">Starting Semester</Label>
              <Select
                value={form.currentSemester}
                onValueChange={(val) => updateField("currentSemester", val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="first">First Semester</SelectItem>
                  <SelectItem value="second">Second Semester</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={form.status}
                onValueChange={(val) => updateField("status", val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Semester Dates */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">
                First Semester Dates (Optional)
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstSemStart">Start Date</Label>
                  <Input
                    id="firstSemStart"
                    type="date"
                    value={form.firstSemStart}
                    onChange={(e) =>
                      updateField("firstSemStart", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="firstSemEnd">End Date</Label>
                  <Input
                    id="firstSemEnd"
                    type="date"
                    value={form.firstSemEnd}
                    onChange={(e) => updateField("firstSemEnd", e.target.value)}
                  />
                </div>
              </div>

              <h3 className="text-sm font-medium">
                Second Semester Dates (Optional)
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="secondSemStart">Start Date</Label>
                  <Input
                    id="secondSemStart"
                    type="date"
                    value={form.secondSemStart}
                    onChange={(e) =>
                      updateField("secondSemStart", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secondSemEnd">End Date</Label>
                  <Input
                    id="secondSemEnd"
                    type="date"
                    value={form.secondSemEnd}
                    onChange={(e) =>
                      updateField("secondSemEnd", e.target.value)
                    }
                  />
                </div>
              </div>
            </div>

            {/* Set as Current */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label htmlFor="isCurrent" className="font-medium">
                  Set as Current Session
                </Label>
                <p className="text-sm text-muted-foreground">
                  Mark this as the active session. Any existing current session
                  will be deactivated.
                </p>
              </div>
              <Switch
                id="isCurrent"
                checked={form.isCurrent}
                onCheckedChange={(checked) => updateField("isCurrent", checked)}
              />
            </div>

            {/* Submit */}
            <div className="flex gap-3 justify-end">
              <Button variant="outline" type="button" asChild>
                <Link href="/admin/academic">Cancel</Link>
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Session"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
