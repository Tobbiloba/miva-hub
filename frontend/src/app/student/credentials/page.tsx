"use client";

import { Award, Copy, ExternalLink, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Credential {
  id: string;
  title: string;
  summary: string;
  overallLevel: "developing" | "proficient" | "distinction";
  competencies: { name: string; level: string; evidence: string }[];
  verificationCode: string;
  issuedAt: string;
  courseCode?: string;
}

const LEVEL_STYLES: Record<string, string> = {
  distinction: "bg-amber-100 text-amber-900 border-amber-300",
  proficient: "bg-emerald-100 text-emerald-900 border-emerald-300",
  developing: "bg-sky-100 text-sky-900 border-sky-300",
};

export default function CredentialsPage() {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<
    { id: string; courseCode: string; title: string }[]
  >([]);
  const [courseId, setCourseId] = useState("");
  const [requesting, setRequesting] = useState(false);

  const load = () => {
    fetch("/api/student/credentials")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setCredentials(data.credentials || []))
      .catch(() => toast.error("Failed to load your credentials"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    fetch("/api/student/tutor")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setCourses(data.courses || []))
      .catch(() => {});
  }, []);

  const request = async () => {
    if (!courseId || requesting) return;
    setRequesting(true);
    try {
      const res = await fetch("/api/student/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error);
      toast.success(
        data.status === "existing"
          ? "You already hold this credential"
          : "Credential issued!",
      );
      load();
    } catch (err) {
      toast.error(
        err instanceof Error && err.message
          ? err.message
          : "Failed to issue credential",
      );
    } finally {
      setRequesting(false);
    }
  };

  const copyLink = (code: string) => {
    navigator.clipboard
      .writeText(`${window.location.origin}/verify/${code}`)
      .then(() => toast.success("Verification link copied"))
      .catch(() => toast.error("Could not copy link"));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Award className="h-6 w-6 text-primary" />
          My Credentials
        </h1>
        <p className="text-muted-foreground">
          Verifiable micro-credentials backed by your real graded work — share
          the public link with anyone.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Request a credential</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Label className="block">Course</Label>
          <div className="flex gap-2 flex-col sm:flex-row">
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Pick a course" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.courseCode} — {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={request}
              disabled={!courseId || requesting}
              aria-label="Request credential"
            >
              {requesting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Assessing
                  your evidence…
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" /> Request
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Requires graded evidence: at least one graded assignment or a
            completed viva session.
          </p>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your
            credentials…
          </CardContent>
        </Card>
      ) : credentials.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No credentials yet — request one above once you have graded work.
          </CardContent>
        </Card>
      ) : (
        credentials.map((cred) => (
          <Card key={cred.id}>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between gap-2 flex-wrap">
                <span>{cred.title}</span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-0.5 text-sm font-medium capitalize ${
                    LEVEL_STYLES[cred.overallLevel] ?? "bg-muted"
                  }`}
                >
                  <Award className="h-3.5 w-3.5" />
                  {cred.overallLevel}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{cred.summary}</p>
              <div className="flex flex-wrap gap-1">
                {cred.competencies.map((c) => (
                  <span
                    key={c.name}
                    className="text-xs rounded-full border px-2 py-0.5 text-muted-foreground capitalize"
                  >
                    {c.name} · {c.level}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyLink(cred.verificationCode)}
                  aria-label="Copy public verification link"
                >
                  <Copy className="mr-2 h-3.5 w-3.5" /> Copy verify link
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link
                    href={`/verify/${cred.verificationCode}`}
                    target="_blank"
                    aria-label="Open public verification page"
                  >
                    <ExternalLink className="mr-2 h-3.5 w-3.5" /> View public
                    page
                  </Link>
                </Button>
                <span className="text-xs text-muted-foreground">
                  Issued {new Date(cred.issuedAt).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
