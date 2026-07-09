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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CheckCircle2,
  Eye,
  FileText,
  Pencil,
  RefreshCw,
  RotateCcw,
  Shield,
  Video,
  XCircle,
} from "lucide-react";
import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

interface ModerationItem {
  id: string;
  title: string;
  description: string | null;
  materialType: string;
  mimeType: string | null;
  fileName: string | null;
  fileSize: number | null;
  contentUrl: string | null;
  publicUrl: string | null;
  weekNumber: number | null;
  ingestionSource: string;
  createdAt: string;
  courseCode: string;
  courseTitle: string;
  volunteerName: string | null;
  volunteerEmail: string | null;
  transcriptStatus: string | null;
  transcriptWordCount: number | null;
  transcriptErrorMessage: string | null;
}

interface EditForm {
  title: string;
  description: string;
  materialType: string;
  weekNumber: string;
}

export default function ModerationQueuePage() {
  const [items, setItems] = useState<ModerationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [editItem, setEditItem] = useState<ModerationItem | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    title: "",
    description: "",
    materialType: "",
    weekNumber: "",
  });
  const [previewItem, setPreviewItem] = useState<ModerationItem | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [transcriptFilter, setTranscriptFilter] = useState<string>("all");
  const [transcriptViewItem, setTranscriptViewItem] = useState<{
    id: string;
    title: string;
    text: string | null;
    source: string | null;
    wordCount: number | null;
  } | null>(null);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [forceRecaptureItem, setForceRecaptureItem] =
    useState<ModerationItem | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const filterParam =
        transcriptFilter !== "all"
          ? `&transcriptStatus=${transcriptFilter}`
          : "";
      const res = await fetch(
        `/api/admin/content/moderation?page=${page}&limit=50${filterParam}`,
      );
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setItems(data.items);
      setTotalPages(data.pagination.totalPages);
      setTotal(data.pagination.total);
    } catch {
      toast.error("Failed to load moderation queue");
    } finally {
      setLoading(false);
    }
  }, [page, transcriptFilter]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  async function handleAction(
    id: string,
    action: "approve" | "reject",
    extra?: Record<string, any>,
  ) {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/content/moderation/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      if (!res.ok) throw new Error("Action failed");
      toast.success(
        action === "approve"
          ? "Content approved and published"
          : "Content rejected",
      );
      setItems((prev) => prev.filter((item) => item.id !== id));
      setTotal((prev) => prev - 1);
    } catch {
      toast.error(`Failed to ${action} content`);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleEdit() {
    if (!editItem) return;
    setActionLoading(editItem.id);
    try {
      const res = await fetch(`/api/admin/content/moderation/${editItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "edit",
          title: editForm.title,
          description: editForm.description,
          materialType: editForm.materialType,
          weekNumber: editForm.weekNumber
            ? parseInt(editForm.weekNumber)
            : null,
        }),
      });
      if (!res.ok) throw new Error("Edit failed");
      toast.success("Content updated");
      setEditItem(null);
      fetchItems();
    } catch {
      toast.error("Failed to edit content");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReExtract(id: string) {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/content/moderation/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "re-extract" }),
      });
      if (!res.ok) throw new Error("Re-extract failed");
      const data = await res.json();
      toast.success(
        data.transcriptStatus === "extracted"
          ? `Transcript extracted (${data.wordCount} words)`
          : `Extraction ${data.transcriptStatus}: ${data.error || ""}`,
      );
      fetchItems();
    } catch {
      toast.error("Failed to re-extract transcript");
    } finally {
      setActionLoading(null);
    }
  }

  async function viewTranscript(item: ModerationItem) {
    setTranscriptLoading(true);
    try {
      const res = await fetch(`/api/admin/content/moderation/${item.id}`);
      if (!res.ok) throw new Error("Failed to fetch transcript");
      const data = await res.json();
      setTranscriptViewItem({
        id: data.id,
        title: data.title,
        text: data.transcriptText,
        source: data.transcriptSource,
        wordCount: data.transcriptWordCount,
      });
    } catch {
      toast.error("Failed to load transcript");
    } finally {
      setTranscriptLoading(false);
    }
  }

  async function handleForceRecapture() {
    if (!forceRecaptureItem) return;
    setActionLoading(forceRecaptureItem.id);
    try {
      const res = await fetch(
        `/api/admin/content/moderation/${forceRecaptureItem.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "force-recapture" }),
        },
      );
      if (!res.ok) throw new Error("Force re-capture failed");
      toast.success(
        "Existing capture removed. Volunteers can now re-capture this lesson.",
      );
      setForceRecaptureItem(null);
      setItems((prev) =>
        prev.filter((item) => item.id !== forceRecaptureItem.id),
      );
      setTotal((prev) => prev - 1);
    } catch {
      toast.error("Failed to force re-capture");
    } finally {
      setActionLoading(null);
    }
  }

  function openEdit(item: ModerationItem) {
    setEditForm({
      title: item.title,
      description: item.description || "",
      materialType: item.materialType,
      weekNumber: item.weekNumber?.toString() || "",
    });
    setEditItem(item);
  }

  function formatFileSize(bytes: number | null) {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-NG", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function transcriptBadgeVariant(
    status: string | null,
  ): "default" | "secondary" | "destructive" | "outline" {
    switch (status) {
      case "extracted":
        return "default";
      case "failed":
        return "destructive";
      case "extracting":
        return "secondary";
      case "skipped":
        return "outline";
      default:
        return "outline";
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Content Moderation Queue
          </h1>
          <p className="text-muted-foreground mt-1">
            Review and approve volunteer-captured lesson content before it goes
            live.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={transcriptFilter}
            onValueChange={(v) => {
              setTranscriptFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Transcript filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All transcripts</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="extracted">Extracted</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="skipped">Skipped</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="outline">{total} pending</Badge>
          <Button variant="outline" size="sm" onClick={fetchItems}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Review</CardTitle>
          <CardDescription>
            Content captured by volunteers via the Askly Capture extension.
            Approve to make visible to students, or reject to remove.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading...
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">All caught up!</p>
              <p className="text-sm mt-1">
                No content is waiting for moderation.
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Content</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Week</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Transcript</TableHead>
                    <TableHead>Volunteer</TableHead>
                    <TableHead>Captured</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {item.mimeType?.startsWith("video/") ? (
                            <Video className="h-4 w-4 text-blue-500" />
                          ) : (
                            <FileText className="h-4 w-4 text-amber-600" />
                          )}
                          <div>
                            <p className="font-medium text-sm max-w-[200px] truncate">
                              {item.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(item.fileSize)}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.courseCode}</Badge>
                      </TableCell>
                      <TableCell>
                        {item.weekNumber ? `Week ${item.weekNumber}` : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            item.materialType === "lecture"
                              ? "default"
                              : item.materialType === "quiz"
                                ? "outline"
                                : item.materialType === "assignment_external"
                                  ? "outline"
                                  : "secondary"
                          }
                          className={
                            item.materialType === "quiz"
                              ? "border-purple-400 text-purple-700"
                              : item.materialType === "assignment_external"
                                ? "border-green-400 text-green-700"
                                : ""
                          }
                        >
                          {item.materialType === "assignment_external"
                            ? "assignment"
                            : item.materialType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge
                            variant={transcriptBadgeVariant(
                              item.transcriptStatus,
                            )}
                          >
                            {item.transcriptStatus || "pending"}
                          </Badge>
                          {item.transcriptWordCount && (
                            <span className="text-xs text-muted-foreground">
                              {item.transcriptWordCount.toLocaleString()} words
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">
                            {item.volunteerName || "Unknown"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.volunteerEmail}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(item.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-1 justify-end">
                          {item.transcriptStatus === "extracted" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => viewTranscript(item)}
                              disabled={transcriptLoading}
                              title="View transcript"
                            >
                              <FileText className="h-4 w-4 text-green-600" />
                            </Button>
                          )}
                          {(item.transcriptStatus === "failed" ||
                            item.transcriptStatus === "skipped") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleReExtract(item.id)}
                              disabled={actionLoading === item.id}
                              title="Re-extract transcript"
                            >
                              <RefreshCw className="h-4 w-4 text-orange-500" />
                            </Button>
                          )}
                          {item.publicUrl && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setPreviewItem(item)}
                              title="Preview"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(item)}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => handleAction(item.id, "approve")}
                            disabled={actionLoading === item.id}
                            title="Approve"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleAction(item.id, "reject")}
                            disabled={actionLoading === item.id}
                            title="Reject"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                            onClick={() => setForceRecaptureItem(item)}
                            disabled={actionLoading === item.id}
                            title="Force re-capture (remove and allow new)"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {totalPages} ({total} items)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={page >= totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Force Re-capture Confirmation Dialog */}
      <Dialog
        open={!!forceRecaptureItem}
        onOpenChange={(open) => !open && setForceRecaptureItem(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Force Re-capture</DialogTitle>
            <DialogDescription>
              This will remove the existing capture of &ldquo;
              {forceRecaptureItem?.title}&rdquo; and allow a new volunteer to
              capture it. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 text-sm text-muted-foreground">
            <p>
              <strong>Course:</strong> {forceRecaptureItem?.courseCode}
            </p>
            <p>
              <strong>Week:</strong>{" "}
              {forceRecaptureItem?.weekNumber
                ? `Week ${forceRecaptureItem.weekNumber}`
                : "—"}
            </p>
            <p>
              <strong>Captured by:</strong>{" "}
              {forceRecaptureItem?.volunteerName || "Unknown"}
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setForceRecaptureItem(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleForceRecapture}
              disabled={!!actionLoading}
            >
              Remove & Allow Re-capture
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={!!editItem}
        onOpenChange={(open) => !open && setEditItem(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Content</DialogTitle>
            <DialogDescription>
              Update content details before approving.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                value={editForm.title}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, title: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Input
                value={editForm.description}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Material Type</label>
                <Select
                  value={editForm.materialType}
                  onValueChange={(v) =>
                    setEditForm((f) => ({ ...f, materialType: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lecture">Lecture</SelectItem>
                    <SelectItem value="reading">Reading</SelectItem>
                    <SelectItem value="syllabus">Syllabus</SelectItem>
                    <SelectItem value="resource">Resource</SelectItem>
                    <SelectItem value="assignment">Assignment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Week Number</label>
                <Input
                  type="number"
                  min="1"
                  max="16"
                  value={editForm.weekNumber}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, weekNumber: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={!!actionLoading}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transcript View Dialog */}
      <Dialog
        open={!!transcriptViewItem}
        onOpenChange={(open) => !open && setTranscriptViewItem(null)}
      >
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Transcript: {transcriptViewItem?.title}</DialogTitle>
            <DialogDescription>
              Source: {transcriptViewItem?.source || "unknown"} &middot;{" "}
              {transcriptViewItem?.wordCount?.toLocaleString() || 0} words
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 overflow-auto max-h-[60vh]">
            {transcriptViewItem?.text ? (
              <pre className="whitespace-pre-wrap text-sm font-mono bg-muted p-4 rounded">
                {transcriptViewItem.text}
              </pre>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No transcript text available.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog
        open={!!previewItem}
        onOpenChange={(open) => !open && setPreviewItem(null)}
      >
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{previewItem?.title}</DialogTitle>
            <DialogDescription>
              {previewItem?.courseCode} &middot;{" "}
              {previewItem?.weekNumber
                ? `Week ${previewItem.weekNumber}`
                : "No week"}{" "}
              &middot; {previewItem?.materialType}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 overflow-auto max-h-[60vh]">
            {previewItem?.mimeType === "application/pdf" &&
            previewItem?.publicUrl ? (
              <embed
                src={previewItem.publicUrl}
                type="application/pdf"
                className="w-full h-[500px] rounded"
              />
            ) : previewItem?.mimeType?.startsWith("video/") &&
              previewItem?.publicUrl ? (
              <video
                src={previewItem.publicUrl}
                controls
                className="w-full rounded"
              >
                Your browser does not support video playback.
              </video>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Preview not available for this file type</p>
                {previewItem?.publicUrl && (
                  <a
                    href={previewItem.publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 underline text-sm mt-2 block"
                  >
                    Open in new tab
                  </a>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
