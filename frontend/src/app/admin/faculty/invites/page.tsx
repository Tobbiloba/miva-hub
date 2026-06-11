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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Mail, Send, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Department {
  id: string;
  name: string;
  code: string;
}

interface Invite {
  id: string;
  email: string;
  name: string | null;
  position: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  expiresAt: string;
  createdAt: string;
}

const positionOptions = [
  { value: "professor", label: "Professor" },
  { value: "associate_professor", label: "Associate Professor" },
  { value: "assistant_professor", label: "Assistant Professor" },
  { value: "lecturer", label: "Lecturer" },
  { value: "instructor", label: "Instructor" },
  { value: "visiting_professor", label: "Visiting Professor" },
];

const statusBadge: Record<Invite["status"], string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  accepted: "bg-green-100 text-green-800 border-green-200",
  revoked: "bg-gray-100 text-gray-600 border-gray-200",
  expired: "bg-red-100 text-red-800 border-red-200",
};

export default function FacultyInvitesPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [position, setPosition] = useState("");
  const [departmentId, setDepartmentId] = useState("");

  const { toast } = useToast();

  const fetchInvites = async () => {
    try {
      const response = await fetch("/api/admin/faculty/invites");
      const data = await response.json();
      if (data.success) setInvites(data.data);
    } catch {
      toast({
        title: "Error",
        description: "Failed to load invites",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch("/api/admin/departments")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setDepartments(data.data);
      })
      .catch(() => {});
    fetchInvites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSend = async () => {
    if (!email || !position || !departmentId) {
      toast({
        title: "Missing fields",
        description: "Email, position and department are required",
        variant: "destructive",
      });
      return;
    }
    setIsSending(true);
    try {
      const response = await fetch("/api/admin/faculty/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name: name || undefined,
          position,
          departmentId,
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast({ title: "Invite created", description: data.message });
        if (!data.data.emailSent && data.data.inviteUrl) {
          await navigator.clipboard
            .writeText(data.data.inviteUrl)
            .catch(() => {});
        }
        setEmail("");
        setName("");
        setPosition("");
        setDepartmentId("");
        fetchInvites();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to send invite",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to send invite",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleRevoke = async (id: string) => {
    setRevokingId(id);
    try {
      const response = await fetch(`/api/admin/faculty/invites/${id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (data.success) {
        toast({ title: "Revoked", description: "Invite revoked" });
        setInvites((prev) =>
          prev.map((i) => (i.id === id ? { ...i, status: "revoked" } : i)),
        );
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to revoke",
          variant: "destructive",
        });
      }
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/admin/faculty">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Faculty
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="h-6 w-6 text-blue-600" />
            Faculty Invites
          </h1>
          <p className="text-muted-foreground text-sm">
            Invite faculty by email — they set their own password via a secure
            link
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Send an invite</CardTitle>
          <CardDescription>
            The invite link expires in 7 days. Email must be on your
            university&apos;s domains.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="e.g. jane.smith@youruniversity.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name (optional)</Label>
              <Input
                id="name"
                placeholder="e.g. Dr. Jane Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Position *</Label>
              <Select value={position} onValueChange={setPosition}>
                <SelectTrigger>
                  <SelectValue placeholder="Select position" />
                </SelectTrigger>
                <SelectContent>
                  {positionOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Department *</Label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
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
          </div>
          <Button onClick={handleSend} disabled={isSending}>
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Send className="h-4 w-4 mr-1" />
            )}
            Send invite
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sent invites</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : invites.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No invites sent yet.
            </p>
          ) : (
            <div className="space-y-3">
              {invites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between gap-4 border rounded-md px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {invite.name || invite.email}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {invite.email} · {invite.position.replace(/_/g, " ")} ·
                      expires {new Date(invite.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant="outline"
                      className={statusBadge[invite.status]}
                    >
                      {invite.status}
                    </Badge>
                    {invite.status === "pending" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={revokingId === invite.id}
                        onClick={() => handleRevoke(invite.id)}
                      >
                        {revokingId === invite.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
