"use client";

import {
  BadgeCheck,
  Bot,
  Clock,
  Loader2,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "ui/badge";
import { Button } from "ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "ui/card";
import { Tabs, TabsList, TabsTrigger } from "ui/tabs";

interface VerifiedCredential {
  subject: string;
  grade: string;
  isCredit: boolean;
}

interface ApplicationRow {
  id: string;
  fullName: string;
  email: string;
  previousSchool: string | null;
  transcriptText: string;
  documentName: string | null;
  status: "under_review" | "admitted" | "waitlisted" | "rejected" | "escalated";
  aiDecision: string | null;
  aiReasoning: string | null;
  aiConfidence: number | null;
  verifiedCredentials: VerifiedCredential[] | null;
  provisionedUserId: string | null;
  reviewedAt: string | null;
  createdAt: string;
  programName: string;
  programCode: string;
}

const STATUS_META: Record<
  ApplicationRow["status"],
  { label: string; className: string }
> = {
  under_review: { label: "Under review", className: "bg-muted" },
  admitted: {
    label: "Admitted",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  waitlisted: {
    label: "Waitlisted",
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  rejected: {
    label: "Rejected",
    className: "bg-destructive/10 text-destructive",
  },
  escalated: {
    label: "Needs human review",
    className: "bg-primary/10 text-primary",
  },
};

const FILTERS = [
  { value: "escalated", label: "Escalated" },
  { value: "all", label: "All" },
  { value: "admitted", label: "Admitted" },
  { value: "waitlisted", label: "Waitlisted" },
  { value: "rejected", label: "Rejected" },
] as const;

export function AdmissionsQueue() {
  const [filter, setFilter] =
    useState<(typeof FILTERS)[number]["value"]>("escalated");
  const [applications, setApplications] = useState<ApplicationRow[] | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [actingOn, setActingOn] = useState<string | null>(null);

  const load = useCallback(async (statusFilter: string) => {
    setApplications(null);
    setError(null);
    try {
      const params = statusFilter === "all" ? "" : `?status=${statusFilter}`;
      const res = await fetch(`/api/admin/admissions${params}`);
      if (!res.ok) throw new Error("Failed to load applications");
      const data = await res.json();
      setApplications(data.applications);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    }
  }, []);

  useEffect(() => {
    load(filter);
  }, [filter, load]);

  const review = async (
    id: string,
    action: "admit" | "waitlist" | "reject",
  ) => {
    setActingOn(id);
    try {
      const res = await fetch(`/api/admin/admissions/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Review failed");
      if (data.credentials) {
        toast.success(
          `Admitted. Student account: ${data.credentials.email} / temp password: ${data.credentials.tempPassword} (share securely — shown once)`,
          { duration: 30000 },
        );
      } else {
        toast.success(`Application ${data.status}`);
      }
      load(filter);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Review failed");
    } finally {
      setActingOn(null);
    }
  };

  return (
    <div className="space-y-4">
      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
        <TabsList>
          {FILTERS.map((f) => (
            <TabsTrigger key={f.value} value={f.value}>
              {f.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {error && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {error}
          </CardContent>
        </Card>
      )}

      {!error && applications === null && (
        <Card>
          <CardContent className="py-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading applications…
          </CardContent>
        </Card>
      )}

      {applications?.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {filter === "escalated"
              ? "No applications waiting for human review — the AI officer is handling everything."
              : "No applications here yet."}
          </CardContent>
        </Card>
      )}

      {applications?.map((app) => {
        const meta = STATUS_META[app.status];
        return (
          <Card key={app.id}>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-base">{app.fullName}</CardTitle>
                <Badge className={meta.className}>{meta.label}</Badge>
                <span className="ml-auto text-xs text-muted-foreground">
                  {new Date(app.createdAt).toLocaleString()}
                </span>
              </div>
              <CardDescription>
                {app.email} → {app.programName} ({app.programCode})
                {app.previousSchool ? ` · ${app.previousSchool}` : ""}
                {app.documentName ? ` · doc: ${app.documentName}` : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {app.aiReasoning && (
                <div className="rounded-md bg-muted/50 p-3 text-sm space-y-2">
                  <p className="flex items-center gap-1.5 font-medium">
                    <Bot className="size-4" />
                    AI officer{app.aiDecision ? `: ${app.aiDecision}` : ""}
                    {app.aiConfidence != null && (
                      <span className="font-normal text-muted-foreground">
                        ({Math.round(app.aiConfidence * 100)}% confident)
                      </span>
                    )}
                  </p>
                  <p className="whitespace-pre-wrap">{app.aiReasoning}</p>
                </div>
              )}
              {!!app.verifiedCredentials?.length && (
                <div className="flex flex-wrap gap-1.5">
                  {app.verifiedCredentials.map((c, i) => (
                    <Badge
                      key={i}
                      variant={c.isCredit ? "secondary" : "outline"}
                      className="font-normal"
                    >
                      {c.subject}: {c.grade}
                    </Badge>
                  ))}
                </div>
              )}
              {app.status === "escalated" && (
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    size="sm"
                    disabled={actingOn === app.id}
                    onClick={() => review(app.id, "admit")}
                  >
                    <BadgeCheck className="size-4" />
                    Admit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={actingOn === app.id}
                    onClick={() => review(app.id, "waitlist")}
                  >
                    <Clock className="size-4" />
                    Waitlist
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={actingOn === app.id}
                    onClick={() => review(app.id, "reject")}
                  >
                    <XCircle className="size-4" />
                    Reject
                  </Button>
                  {actingOn === app.id && (
                    <Loader2 className="size-4 animate-spin self-center text-muted-foreground" />
                  )}
                </div>
              )}
              {app.status !== "escalated" && app.reviewedAt && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ShieldAlert className="size-3.5" />
                  Resolved by a human on{" "}
                  {new Date(app.reviewedAt).toLocaleString()}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
