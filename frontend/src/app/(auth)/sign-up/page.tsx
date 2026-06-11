"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronLeft, Loader, AlertCircle, Info } from "lucide-react";
import { toast } from "sonner";
import { existsByEmailAction } from "@/app/api/auth/actions";

// ── Types ────────────────────────────────────────────────────────────────────

interface Program {
  id: string;
  code: string;
  name: string;
  durationYears: number;
}

interface AcademicSession {
  sessionName: string;
  currentSemester: "first" | "second";
  academicYear: string;
  enrollmentSemester: string;
  status: string;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function SignUpPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [programId, setProgramId] = useState("");
  const [level, setLevel] = useState("");
  const [matricNumber, setMatricNumber] = useState("");

  // Data
  const [programs, setPrograms] = useState<Program[]>([]);
  const [session, setSession] = useState<AcademicSession | null>(null);

  // ToS acceptance
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Validation state
  const [emailWarning, setEmailWarning] = useState("");
  const [matricError, setMatricError] = useState("");

  // Fetch programs and session on mount
  useEffect(() => {
    fetch("/api/programs/public")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setPrograms(data);
      })
      .catch(() => toast.error("Failed to load programs"));

    fetch("/api/academic/session/current")
      .then((r) => r.json())
      .then((data) => {
        if (data.sessionName) setSession(data);
      })
      .catch(() => {});
  }, []);

  // Email domain check (soft warning)
  useEffect(() => {
    if (email && !email.toLowerCase().endsWith("@miva.edu.ng")) {
      setEmailWarning("We recommend using your MIVA email (@miva.edu.ng)");
    } else {
      setEmailWarning("");
    }
  }, [email]);

  // Matric number format validation
  useEffect(() => {
    if (matricNumber && !/^MIVA\/[A-Z]{2,4}\/\d{4}\/\d{3}$/.test(matricNumber)) {
      setMatricError("Format: MIVA/DEPT/YEAR/NNN (e.g. MIVA/CS/2025/001)");
    } else {
      setMatricError("");
    }
  }, [matricNumber]);

  const passwordStrong =
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password);

  // ── Step 1 validation ──────────────────────────────────────────────────────

  const validateStep1 = async (): Promise<boolean> => {
    if (!name.trim()) {
      toast.error("Please enter your full name");
      return false;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address");
      return false;
    }
    if (!passwordStrong) {
      toast.error("Password needs 8+ chars, one uppercase, one number");
      return false;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords don't match");
      return false;
    }

    // Check if email already exists
    setIsLoading(true);
    try {
      const exists = await existsByEmailAction(email);
      if (exists) {
        toast.error("An account with this email already exists");
        return false;
      }
    } catch {
      // Allow through if check fails
    } finally {
      setIsLoading(false);
    }

    return true;
  };

  // ── Step 2 validation + submit ─────────────────────────────────────────────

  const validateAndSubmit = async () => {
    if (!programId) {
      toast.error("Please select your program");
      return;
    }
    if (!level) {
      toast.error("Please select your level");
      return;
    }
    if (!session) {
      toast.error("No active academic session available. Contact admin.");
      return;
    }
    if (matricError) {
      toast.error("Please fix the matric number format or leave it blank");
      return;
    }
    if (!termsAccepted) {
      toast.error("You must agree to the Terms of Service and Privacy Policy");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.toLowerCase().trim(),
          password,
          programId,
          level: Number(level),
          matricNumber: matricNumber.trim() || undefined,
          termsAccepted: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Registration failed");
      }

      const enrolledCount = data.enrolledCourses ?? 0;
      const semesterLabel =
        data.semester === "first" ? "First Semester" : "Second Semester";

      toast.success(
        enrolledCount > 0
          ? `Welcome! You're enrolled in ${enrolledCount} courses for ${semesterLabel} ${data.academicYear}. Check your email to verify your account.`
          : `Account created! Check your email to verify your account, then sign in.`,
        { duration: 8000 }
      );

      // Brief delay so the user sees the success toast
      setTimeout(() => router.push("/sign-in"), 2500);
    } catch (error: any) {
      toast.error(error.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = async () => {
    if (step === 1) {
      const valid = await validateStep1();
      if (valid) setStep(2);
    } else {
      await validateAndSubmit();
    }
  };

  const selectedProgram = programs.find((p) => p.id === programId);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="animate-in fade-in duration-1000 w-full h-full flex flex-col p-4 md:p-8 justify-center relative">
      <div className="w-full flex justify-end absolute top-0 right-0">
        <Link href="/sign-in">
          <Button variant="ghost">Sign In</Button>
        </Link>
      </div>

      <Card className="w-full md:max-w-lg bg-background border-none mx-auto gap-0 shadow-none">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            Join MIVA University
          </CardTitle>
          <CardDescription className="py-6">
            <div className="flex flex-col gap-2">
              <p className="text-xs text-muted-foreground text-right">
                Step {step} of 2
              </p>
              <div className="h-2 w-full relative bg-input rounded-full overflow-hidden">
                <div
                  style={{ width: `${(step / 2) * 100}%` }}
                  className="h-full bg-primary transition-all duration-300"
                />
              </div>
            </div>
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="flex flex-col gap-4">
            {/* ── Step 1: Basic Info ───────────────────────────────────── */}
            {step === 1 && (
              <>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isLoading}
                    autoFocus
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@miva.edu.ng"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                  />
                  {emailWarning && (
                    <p className="text-xs text-amber-500 flex items-center gap-1">
                      <Info className="size-3 shrink-0" />
                      {emailWarning}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Min 8 chars, 1 uppercase, 1 number"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                  />
                  {password && (
                    <div className="flex gap-1.5 mt-1">
                      <div
                        className={`h-1 flex-1 rounded-full ${
                          password.length >= 8
                            ? "bg-green-500"
                            : "bg-muted-foreground/30"
                        }`}
                      />
                      <div
                        className={`h-1 flex-1 rounded-full ${
                          /[A-Z]/.test(password)
                            ? "bg-green-500"
                            : "bg-muted-foreground/30"
                        }`}
                      />
                      <div
                        className={`h-1 flex-1 rounded-full ${
                          /[0-9]/.test(password)
                            ? "bg-green-500"
                            : "bg-muted-foreground/30"
                        }`}
                      />
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                  />
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="size-3" />
                      Passwords don&apos;t match
                    </p>
                  )}
                </div>
              </>
            )}

            {/* ── Step 2: Academic Info ────────────────────────────────── */}
            {step === 2 && (
              <>
                <div className="flex flex-col gap-2">
                  <Label>Program</Label>
                  <Select value={programId} onValueChange={setProgramId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your program" />
                    </SelectTrigger>
                    <SelectContent>
                      {programs.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          B.Sc {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-2">
                  <Label>Level</Label>
                  <Select value={level} onValueChange={setLevel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="100">100 Level</SelectItem>
                      <SelectItem value="200">200 Level</SelectItem>
                      <SelectItem value="300">300 Level</SelectItem>
                      <SelectItem value="400">400 Level</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Session/Semester — read-only display */}
                {session ? (
                  <div className="rounded-lg border bg-muted/50 px-4 py-3">
                    <p className="text-xs text-muted-foreground mb-1">
                      Current Session
                    </p>
                    <p className="text-sm font-medium">
                      {session.sessionName} &middot;{" "}
                      {session.currentSemester === "first"
                        ? "First Semester"
                        : "Second Semester"}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
                    <p className="text-xs text-destructive">
                      No active academic session detected. Contact admin.
                    </p>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <Label htmlFor="matric">
                    Matric Number{" "}
                    <span className="text-muted-foreground font-normal">
                      (optional)
                    </span>
                  </Label>
                  <Input
                    id="matric"
                    placeholder="MIVA/CS/2025/001"
                    value={matricNumber}
                    onChange={(e) => setMatricNumber(e.target.value.toUpperCase())}
                    disabled={isLoading}
                  />
                  {matricError && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="size-3 shrink-0" />
                      {matricError}
                    </p>
                  )}
                </div>

                {/* Preview what they'll be enrolled in */}
                {selectedProgram && level && session && (
                  <div className="rounded-lg border bg-muted/30 px-4 py-3">
                    <p className="text-xs text-muted-foreground">
                      You&apos;ll be auto-enrolled in all compulsory{" "}
                      <span className="font-medium text-foreground">
                        {level}L {selectedProgram.code}
                      </span>{" "}
                      courses for{" "}
                      <span className="font-medium text-foreground">
                        {session.currentSemester === "first"
                          ? "First"
                          : "Second"}{" "}
                        Semester {session.academicYear}
                      </span>
                    </p>
                  </div>
                )}
              </>
            )}

            {/* ── ToS Checkbox (Step 2 only) ────────────────────────── */}
            {step === 2 && (
              <div className="flex items-start gap-2 mt-2">
                <Checkbox
                  id="terms"
                  checked={termsAccepted}
                  onCheckedChange={(checked) =>
                    setTermsAccepted(checked === true)
                  }
                  disabled={isLoading}
                />
                <label
                  htmlFor="terms"
                  className="text-xs text-muted-foreground leading-tight cursor-pointer"
                >
                  I agree to the{" "}
                  <a
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a
                    href="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    Privacy Policy
                  </a>
                </label>
              </div>
            )}

            {/* ── Step label ──────────────────────────────────────────── */}
            <p className="text-muted-foreground text-xs mb-2">
              {step === 1 ? "Basic Information" : "Academic Information"}
            </p>

            {/* ── Navigation buttons ──────────────────────────────────── */}
            <div className="flex gap-2">
              <Button
                disabled={isLoading}
                className={step === 1 ? "opacity-0 pointer-events-none" : ""}
                style={{ width: "50%" }}
                variant="ghost"
                onClick={() => setStep(1)}
              >
                <ChevronLeft className="size-4" />
                Back
              </Button>
              <Button
                disabled={isLoading}
                style={{ width: "50%" }}
                onClick={handleNext}
              >
                {step === 2 ? "Create Account" : "Next"}
                {isLoading && <Loader className="size-4 ml-2 animate-spin" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
