"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Ban,
  Building2,
  CheckCircle2,
  Loader2,
  Mail,
  RotateCcw,
} from "lucide-react";
import { useEffect, useState } from "react";

interface University {
  id: string;
  name: string;
  slug: string;
  emailDomains: string[];
  supportEmail: string | null;
  status: "pending" | "active" | "suspended";
  createdAt: string;
}

const statusBadge: Record<University["status"], string> = {
  pending:
    "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  active:
    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  suspended: "bg-destructive/10 text-destructive border-destructive/30",
};

export function UniversityManagementClient() {
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchUniversities = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/super-admin/universities?status=${statusFilter}`,
      );
      const data = await response.json();
      if (data.success) {
        setUniversities(data.data);
      } else {
        throw new Error(data.error || "Failed to load universities");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUniversities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const updateStatus = async (
    id: string,
    status: University["status"],
    label: string,
  ) => {
    setUpdatingId(id);
    try {
      const response = await fetch(`/api/super-admin/universities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (data.success) {
        toast({ title: "Updated", description: `University ${label}.` });
        setUniversities((prev) =>
          prev.map((u) => (u.id === id ? { ...u, status } : u)),
        );
      } else {
        throw new Error(data.error || "Update failed");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Update failed",
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-8 w-8 text-primary" />
            Universities
          </h1>
          <p className="text-muted-foreground mt-1">
            Review registrations and manage tenants across the platform
          </p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : universities.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No universities found
            {statusFilter !== "all" ? ` with status "${statusFilter}"` : ""}.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {universities.map((u) => (
            <Card key={u.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {u.name}
                      <Badge
                        variant="outline"
                        className={statusBadge[u.status]}
                      >
                        {u.status}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="mt-1">
                      /{u.slug} · registered{" "}
                      {new Date(u.createdAt).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {u.status === "pending" && (
                      <Button
                        size="sm"
                        disabled={updatingId === u.id}
                        onClick={() => updateStatus(u.id, "active", "approved")}
                      >
                        {updatingId === u.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Approve
                          </>
                        )}
                      </Button>
                    )}
                    {u.status === "active" && (
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={updatingId === u.id}
                        onClick={() =>
                          updateStatus(u.id, "suspended", "suspended")
                        }
                      >
                        {updatingId === u.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Ban className="h-4 w-4 mr-1" />
                            Suspend
                          </>
                        )}
                      </Button>
                    )}
                    {u.status === "suspended" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={updatingId === u.id}
                        onClick={() =>
                          updateStatus(u.id, "active", "reactivated")
                        }
                      >
                        {updatingId === u.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Reactivate
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <span>
                  Domains:{" "}
                  <span className="font-mono">
                    {u.emailDomains.join(", ") || "—"}
                  </span>
                </span>
                {u.supportEmail && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" />
                    {u.supportEmail}
                  </span>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
