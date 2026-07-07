"use client";

import {
  BadgeCheck,
  Clock,
  FileUp,
  GraduationCap,
  Loader2,
  ShieldAlert,
  X,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { Input } from "ui/input";
import { Label } from "ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "ui/select";
import { Textarea } from "ui/textarea";

interface ProgramOption {
  id: string;
  name: string;
  code: string;
  department: string;
}

interface UniversityOption {
  id: string;
  name: string;
  programs: ProgramOption[];
}

interface VerifiedCredential {
  subject: string;
  grade: string;
  isCredit: boolean;
}

interface ApplicationResult {
  status: "admitted" | "waitlisted" | "rejected" | "escalated";
  reasoning: string;
  verifiedCredentials: VerifiedCredential[];
  confidence: number;
  credentials: {
    email: string;
    studentId: string;
    tempPassword: string;
  } | null;
}

const MAX_FILE_BYTES = 4.5 * 1024 * 1024;
const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

const RESULT_META: Record<
  ApplicationResult["status"],
  { title: string; icon: typeof BadgeCheck; tone: string }
> = {
  admitted: {
    title: "Congratulations — you're admitted!",
    icon: BadgeCheck,
    tone: "text-green-600",
  },
  waitlisted: {
    title: "You've been waitlisted",
    icon: Clock,
    tone: "text-amber-600",
  },
  rejected: {
    title: "Your application was not successful",
    icon: XCircle,
    tone: "text-destructive",
  },
  escalated: {
    title: "Your application is with our admissions team",
    icon: ShieldAlert,
    tone: "text-blue-600",
  },
};

export function AdmissionApplication() {
  const [universities, setUniversities] = useState<UniversityOption[] | null>(
    null,
  );
  const [loadError, setLoadError] = useState<string | null>(null);

  const [universityId, setUniversityId] = useState("");
  const [programId, setProgramId] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [previousSchool, setPreviousSchool] = useState("");
  const [transcriptText, setTranscriptText] = useState("");
  const [personalStatement, setPersonalStatement] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ApplicationResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admissions/apply")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load programs");
        return res.json();
      })
      .then((data: { universities: UniversityOption[] }) => {
        if (cancelled) return;
        setUniversities(data.universities);
        if (data.universities.length === 1)
          setUniversityId(data.universities[0].id);
      })
      .catch((error) => {
        if (cancelled) return;
        setLoadError(
          error instanceof Error ? error.message : "Failed to load programs",
        );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const programs = useMemo(
    () => universities?.find((u) => u.id === universityId)?.programs ?? [],
    [universities, universityId],
  );

  const onFileChange = (selected: File | null) => {
    if (!selected) {
      setFile(null);
      return;
    }
    if (!ACCEPTED_TYPES.includes(selected.type)) {
      toast.error("Upload an image (JPG/PNG/WebP) or PDF");
      return;
    }
    if (selected.size > MAX_FILE_BYTES) {
      toast.error("File too large — maximum 4.5 MB");
      return;
    }
    setFile(selected);
  };

  const canSubmit =
    !!programId &&
    fullName.trim().length >= 2 &&
    /\S+@\S+\.\S+/.test(email) &&
    transcriptText.trim().length >= 20 &&
    !submitting;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      let document: {
        name: string;
        mediaType: string;
        dataBase64: string;
      } | null = null;
      if (file) {
        const buffer = await file.arrayBuffer();
        let binary = "";
        const bytes = new Uint8Array(buffer);
        const chunk = 0x8000;
        for (let i = 0; i < bytes.length; i += chunk) {
          binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
        }
        document = {
          name: file.name,
          mediaType: file.type,
          dataBase64: btoa(binary),
        };
      }

      const res = await fetch("/api/admissions/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programId,
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          previousSchool: previousSchool.trim() || undefined,
          transcriptText: transcriptText.trim(),
          personalStatement: personalStatement.trim() || undefined,
          document: document ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Application failed");
      setResult(data);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loadError) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          {loadError}
        </CardContent>
      </Card>
    );
  }

  if (universities === null) {
    return (
      <Card>
        <CardContent className="py-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading programs…
        </CardContent>
      </Card>
    );
  }

  if (universities.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No programs are accepting applications right now.
        </CardContent>
      </Card>
    );
  }

  if (result) {
    const meta = RESULT_META[result.status];
    const Icon = meta.icon;
    return (
      <Card>
        <CardHeader className="items-center text-center">
          <Icon className={`size-10 ${meta.tone}`} />
          <CardTitle>{meta.title}</CardTitle>
          <CardDescription className="max-w-xl whitespace-pre-wrap text-left">
            {result.reasoning}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {result.verifiedCredentials.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">
                Credentials our admissions officer verified:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {result.verifiedCredentials.map((c, i) => (
                  <Badge
                    key={i}
                    variant={c.isCredit ? "secondary" : "outline"}
                    className="font-normal"
                  >
                    {c.subject}: {c.grade}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {result.credentials && (
            <div className="rounded-lg border bg-muted/50 p-4 space-y-1 text-sm">
              <p className="font-medium">
                Your student account is ready — save these now, they are shown
                only once:
              </p>
              <p>
                Email:{" "}
                <span className="font-mono">{result.credentials.email}</span>
              </p>
              <p>
                Student ID:{" "}
                <span className="font-mono">
                  {result.credentials.studentId}
                </span>
              </p>
              <p>
                Temporary password:{" "}
                <span className="font-mono">
                  {result.credentials.tempPassword}
                </span>
              </p>
              <Button asChild className="mt-3">
                <Link href="/sign-in">Sign in to your student portal</Link>
              </Button>
            </div>
          )}
          {result.status === "escalated" && (
            <p className="text-sm text-muted-foreground">
              A human admissions officer will review your application and reach
              you at your email address.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={submit}>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <GraduationCap className="size-5 text-muted-foreground" />
            <CardTitle>Application form</CardTitle>
          </div>
          <CardDescription>
            Our AI admissions officer reviews your record instantly — most
            applicants get a decision in under a minute.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>University</Label>
              <Select
                value={universityId}
                onValueChange={(v) => {
                  setUniversityId(v);
                  setProgramId("");
                }}
              >
                <SelectTrigger aria-label="Select university">
                  <SelectValue placeholder="Choose a university" />
                </SelectTrigger>
                <SelectContent>
                  {universities.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Program</Label>
              <Select
                value={programId}
                onValueChange={setProgramId}
                disabled={!universityId}
              >
                <SelectTrigger aria-label="Select program">
                  <SelectValue placeholder="Choose a program" />
                </SelectTrigger>
                <SelectContent>
                  {programs.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.code}) — {p.department}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="apply-name">Full name</Label>
              <Input
                id="apply-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Chiamaka Okafor"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apply-email">Email</Label>
              <Input
                id="apply-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apply-phone">Phone (optional)</Label>
              <Input
                id="apply-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+234…"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apply-school">Previous school (optional)</Label>
              <Input
                id="apply-school"
                value={previousSchool}
                onChange={(e) => setPreviousSchool(e.target.value)}
                placeholder="e.g. Kings College, Lagos"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="apply-transcript">
              Your results (WAEC/NECO or transcript)
            </Label>
            <Textarea
              id="apply-transcript"
              value={transcriptText}
              onChange={(e) => setTranscriptText(e.target.value)}
              placeholder={
                "Type your subjects and grades, e.g.\nEnglish Language — B3\nMathematics — B2\nPhysics — C4\n…"
              }
              rows={6}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="apply-document">
              Result slip / transcript document (optional — photo or PDF)
            </Label>
            {file ? (
              <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                <FileUp className="size-4 text-muted-foreground shrink-0" />
                <span className="truncate">{file.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="ml-auto size-6"
                  aria-label="Remove document"
                  onClick={() => {
                    setFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                >
                  <X className="size-4" />
                </Button>
              </div>
            ) : (
              <Input
                id="apply-document"
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_TYPES.join(",")}
                onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
              />
            )}
            <p className="text-xs text-muted-foreground">
              Our AI officer reads the document and cross-checks it against your
              typed results. It is never stored.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="apply-statement">
              Personal statement (optional)
            </Label>
            <Textarea
              id="apply-statement"
              value={personalStatement}
              onChange={(e) => setPersonalStatement(e.target.value)}
              placeholder="Tell us why you want to study this program…"
              rows={4}
            />
          </div>

          <Button type="submit" disabled={!canSubmit} className="w-full">
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Our admissions officer is reviewing your application…
              </>
            ) : (
              "Submit application"
            )}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
