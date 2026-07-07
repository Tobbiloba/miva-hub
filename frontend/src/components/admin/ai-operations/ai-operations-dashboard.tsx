"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle,
  Bot,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Gauge,
  LifeBuoy,
  ListChecks,
  UserCog,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type DecisionType =
  | "grading"
  | "support"
  | "admissions"
  | "tutoring"
  | "content"
  | "operations";

type DecisionStatus =
  | "executed"
  | "pending_review"
  | "approved"
  | "overridden"
  | "rejected";

interface DecisionRow {
  id: string;
  decisionType: DecisionType;
  actor: string;
  model: string;
  decision: string;
  confidence: number | null;
  status: DecisionStatus;
  reviewedById: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

interface StatsPayload {
  sinceDays: number;
  total: number;
  overridden: number;
  overrideRate: number;
  byType: {
    decisionType: DecisionType;
    status: DecisionStatus;
    count: number;
    avgConfidence: number | null;
  }[];
}

interface ApiResponse {
  success: boolean;
  error?: string;
  stats: StatsPayload;
  decisions: DecisionRow[];
  page: number;
  pageSize: number;
  hasMore: boolean;
}

const DECISION_TYPES: DecisionType[] = [
  "grading",
  "support",
  "admissions",
  "tutoring",
  "content",
  "operations",
];

const STATUSES: DecisionStatus[] = [
  "executed",
  "pending_review",
  "approved",
  "overridden",
  "rejected",
];

const STATUS_LABELS: Record<DecisionStatus, string> = {
  executed: "Executed",
  pending_review: "Pending Review",
  approved: "Approved",
  overridden: "Overridden",
  rejected: "Rejected",
};

const TYPE_LABELS: Record<DecisionType, string> = {
  grading: "Grading",
  support: "Support",
  admissions: "Admissions",
  tutoring: "Tutoring",
  content: "Content",
  operations: "Operations",
};

function statusBadgeVariant(
  status: DecisionStatus,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "executed":
    case "approved":
      return "default";
    case "pending_review":
      return "secondary";
    case "overridden":
      return "outline";
    case "rejected":
      return "destructive";
  }
}

function toCsv(rows: DecisionRow[]): string {
  const headers = [
    "Time",
    "Type",
    "Actor",
    "Model",
    "Decision",
    "Confidence",
    "Status",
    "Reviewed By",
    "Reviewed At",
  ];
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const lines = rows.map((r) =>
    [
      new Date(r.createdAt).toISOString(),
      r.decisionType,
      r.actor,
      r.model,
      r.decision,
      r.confidence != null ? r.confidence.toFixed(2) : "",
      r.status,
      r.reviewedById ?? "",
      r.reviewedAt ? new Date(r.reviewedAt).toISOString() : "",
    ]
      .map(escape)
      .join(","),
  );
  return [headers.map(escape).join(","), ...lines].join("\n");
}

export function AIOperationsDashboard() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sinceDays, setSinceDays] = useState("30");
  const [decisionType, setDecisionType] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        sinceDays,
        page: String(page),
      });
      if (decisionType !== "all") params.set("decisionType", decisionType);
      if (status !== "all") params.set("status", status);

      const res = await fetch(`/api/admin/ai-operations?${params.toString()}`);
      const json = (await res.json()) as ApiResponse;
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load AI operations data");
      }
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [sinceDays, decisionType, status, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const reviewDecision = async (id: string, action: "approve" | "reject") => {
    setReviewingId(id);
    try {
      const res = await fetch(`/api/admin/ai-operations/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Review failed");
      toast.success(
        action === "approve" ? "Escalation approved" : "Escalation rejected",
      );
      fetchData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Review failed");
    } finally {
      setReviewingId(null);
    }
  };

  const handleExportCsv = () => {
    if (!data?.decisions.length) return;
    const blob = new Blob([toCsv(data.decisions)], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ai-decisions-page${data.page}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Derived stats
  const stats = data?.stats;
  const pendingReview =
    stats?.byType
      .filter((r) => r.status === "pending_review")
      .reduce((acc, r) => acc + Number(r.count), 0) ?? 0;

  const confidenceGroups =
    stats?.byType.filter((r) => r.avgConfidence != null) ?? [];
  const confidenceWeight = confidenceGroups.reduce(
    (acc, r) => acc + Number(r.count),
    0,
  );
  const avgConfidence =
    confidenceWeight > 0
      ? confidenceGroups.reduce(
          (acc, r) => acc + Number(r.avgConfidence) * Number(r.count),
          0,
        ) / confidenceWeight
      : null;

  // Support escalation rate: share of support decisions the agent could NOT
  // resolve alone (anything that entered/passed human review). Target: <10%.
  const supportRows =
    stats?.byType.filter((r) => r.decisionType === "support") ?? [];
  const supportTotal = supportRows.reduce((acc, r) => acc + Number(r.count), 0);
  const supportEscalated = supportRows
    .filter((r) => r.status !== "executed")
    .reduce((acc, r) => acc + Number(r.count), 0);
  const supportEscalationRate =
    supportTotal > 0 ? supportEscalated / supportTotal : null;

  const totalsByType = DECISION_TYPES.map((type) => ({
    type,
    count:
      stats?.byType
        .filter((r) => r.decisionType === type)
        .reduce((acc, r) => acc + Number(r.count), 0) ?? 0,
  }));
  const maxTypeCount = Math.max(1, ...totalsByType.map((t) => t.count));

  // Error state
  if (error && !loading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <AlertTriangle className="h-8 w-8 text-destructive" />
          <p className="font-medium">Failed to load AI operations</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" onClick={fetchData}>
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={sinceDays}
          onValueChange={(v) => {
            setSinceDays(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[150px]" aria-label="Time range">
            <SelectValue placeholder="Time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={decisionType}
          onValueChange={(v) => {
            setDecisionType(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[160px]" aria-label="Decision type">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {DECISION_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[170px]" aria-label="Status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={loading || !data?.decisions.length}
          >
            <Download className="h-4 w-4 mr-1" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {loading && !data ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-5 w-5 mb-2" />
                <Skeleton className="h-7 w-16 mb-1" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{stats?.total ?? 0}</p>
                    <p className="text-xs text-muted-foreground">
                      Total Decisions
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <UserCog className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">
                      {((stats?.overrideRate ?? 0) * 100).toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Human Override Rate
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Gauge className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">
                      {avgConfidence != null
                        ? `${(avgConfidence * 100).toFixed(0)}%`
                        : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Avg Confidence
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <ListChecks className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{pendingReview}</p>
                    <p className="text-xs text-muted-foreground">
                      Pending Review
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <LifeBuoy className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">
                      {supportEscalationRate != null
                        ? `${(supportEscalationRate * 100).toFixed(1)}%`
                        : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Support Escalation Rate
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Breakdown by type */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Decisions by Type</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && !data ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          ) : (stats?.total ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">
              No decisions in this time range.
            </p>
          ) : (
            <div className="space-y-3">
              {totalsByType.map(({ type, count }) => (
                <div key={type} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 text-sm text-muted-foreground">
                    {TYPE_LABELS[type]}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(count / maxTypeCount) * 100}%` }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right text-sm font-medium">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Decisions table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Decisions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !data?.decisions.length ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <Bot className="h-8 w-8 text-muted-foreground" />
              <p className="font-medium">
                AI agents haven&apos;t recorded decisions yet
              </p>
              <p className="text-sm text-muted-foreground">
                As agents grade, tutor, and handle support, every decision will
                appear here for review.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Actor</TableHead>
                      <TableHead>Decision</TableHead>
                      <TableHead className="text-right">Confidence</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Review</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.decisions.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {new Date(row.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell>{TYPE_LABELS[row.decisionType]}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {row.actor}
                        </TableCell>
                        <TableCell className="max-w-[320px] truncate">
                          {row.decision}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.confidence != null
                            ? `${(row.confidence * 100).toFixed(0)}%`
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusBadgeVariant(row.status)}>
                            {STATUS_LABELS[row.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {row.status === "pending_review" &&
                          row.decisionType === "support" ? (
                            <div className="flex gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2"
                                disabled={reviewingId === row.id}
                                onClick={() =>
                                  reviewDecision(row.id, "approve")
                                }
                                aria-label="Approve escalation"
                              >
                                <Check className="h-3.5 w-3.5" />
                                Approve
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-destructive"
                                disabled={reviewingId === row.id}
                                onClick={() => reviewDecision(row.id, "reject")}
                                aria-label="Reject escalation"
                              >
                                <X className="h-3.5 w-3.5" />
                                Reject
                              </Button>
                            </div>
                          ) : row.reviewedById ? (
                            `${row.reviewedById.slice(0, 8)}…`
                          ) : (
                            "—"
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between pt-4">
                <p className="text-sm text-muted-foreground">
                  Page {data.page}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1 || loading}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!data.hasMore || loading}
                    onClick={() => setPage((p) => p + 1)}
                    aria-label="Next page"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
