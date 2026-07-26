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
  AlertCircle,
  Building2,
  CheckCircle2,
  ChevronLeft,
  Loader,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

export default function UniversityRegisterPage() {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Step 1 — university details
  const [universityName, setUniversityName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [domainsInput, setDomainsInput] = useState("");
  const [supportEmail, setSupportEmail] = useState("");

  // Step 2 — admin account
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [error, setError] = useState("");

  const domains = domainsInput
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);

  const handleNameChange = (value: string) => {
    setUniversityName(value);
    if (!slugEdited) setSlug(slugify(value));
  };

  const validateStep1 = (): string => {
    if (universityName.trim().length < 3) {
      return "Please enter your university's full name";
    }
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(slug)) {
      return "URL identifier must be lowercase letters, numbers and hyphens";
    }
    if (domains.length === 0) {
      return "Enter at least one email domain (e.g. school.edu.ng)";
    }
    const domainRegex =
      /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;
    const bad = domains.find((d) => !domainRegex.test(d));
    if (bad) {
      return `"${bad}" doesn't look like a valid email domain`;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail)) {
      return "Enter a valid support email";
    }
    return "";
  };

  const validateStep2 = (): string => {
    if (adminName.trim().length < 2) {
      return "Enter the administrator's full name";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
      return "Enter a valid admin email";
    }
    const adminDomain = adminEmail.split("@")[1]?.toLowerCase();
    if (!adminDomain || !domains.includes(adminDomain)) {
      return `Your admin email must use one of the domains you listed (${domains.join(", ")})`;
    }
    if (password.length < 8) {
      return "Password must be at least 8 characters";
    }
    if (password !== confirmPassword) {
      return "Passwords do not match";
    }
    if (!termsAccepted) {
      return "You must accept the Terms of Service";
    }
    return "";
  };

  const handleNext = () => {
    const err = validateStep1();
    setError(err);
    if (!err) setStep(2);
  };

  const handleSubmit = async () => {
    const err = validateStep2();
    setError(err);
    if (err) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/university/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          universityName: universityName.trim(),
          slug,
          emailDomains: domains,
          supportEmail: supportEmail.trim(),
          adminName: adminName.trim(),
          adminEmail: adminEmail.trim(),
          adminPassword: password,
          termsAccepted,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSubmitted(true);
      } else {
        setError(data.error || "Registration failed. Please try again.");
        toast.error(data.error || "Registration failed");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex items-center justify-center min-h-full py-12 animate-in fade-in duration-500">
        <Card className="w-full max-w-md border-none shadow-none">
          <CardHeader className="text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
            <CardTitle className="text-2xl">Registration received</CardTitle>
            <CardDescription>
              <strong>{universityName}</strong> is now pending approval. Our
              team will review your registration and activate your university —
              you&apos;ll be able to sign in at that point and your students can
              start joining with their {domains[0]} email addresses.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/sign-in">
              <Button variant="outline">Go to sign in</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-full py-12 animate-in fade-in duration-500">
      <Card className="w-full max-w-md border-none shadow-none">
        <CardHeader>
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
            <Building2 className="h-4 w-4" />
            <span>University registration — step {step} of 2</span>
          </div>
          <CardTitle className="text-2xl">
            {step === 1 ? "Register your university" : "Create admin account"}
          </CardTitle>
          <CardDescription>
            {step === 1
              ? "Bring Askly to your institution. Tell us about your university."
              : "This account will manage your university on Askly."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === 1 ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="universityName">University name</Label>
                <Input
                  id="universityName"
                  placeholder="e.g. MIVA Open University"
                  value={universityName}
                  onChange={(e) => handleNameChange(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">URL identifier</Label>
                <Input
                  id="slug"
                  placeholder="e.g. miva"
                  value={slug}
                  onChange={(e) => {
                    setSlugEdited(true);
                    setSlug(e.target.value.toLowerCase());
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Short, unique identifier for your university on Askly.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="domains">Student email domains</Label>
                <Input
                  id="domains"
                  placeholder="e.g. school.edu.ng, student.school.edu.ng"
                  value={domainsInput}
                  onChange={(e) => setDomainsInput(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Comma-separated. Students and faculty sign up with emails on
                  these domains.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="supportEmail">Support email</Label>
                <Input
                  id="supportEmail"
                  type="email"
                  placeholder="e.g. support@school.edu.ng"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                />
              </div>

              <Button className="w-full" onClick={handleNext}>
                Continue
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="adminName">Full name</Label>
                <Input
                  id="adminName"
                  placeholder="e.g. Dr. Jane Smith"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminEmail">Work email</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  placeholder={`e.g. you@${domains[0] || "school.edu"}`}
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Must be on one of your university&apos;s email domains.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Minimum 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <div className="flex items-start gap-2">
                <Checkbox
                  id="terms"
                  checked={termsAccepted}
                  onCheckedChange={(c) => setTermsAccepted(c === true)}
                  className="mt-0.5"
                />
                <Label
                  htmlFor="terms"
                  className="text-sm font-normal leading-snug"
                >
                  I agree to the{" "}
                  <Link href="/terms" className="underline" target="_blank">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="underline" target="_blank">
                    Privacy Policy
                  </Link>{" "}
                  on behalf of my institution.
                </Label>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setError("");
                    setStep(1);
                  }}
                  disabled={isLoading}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSubmit}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader className="h-4 w-4 animate-spin" />
                  ) : (
                    "Register university"
                  )}
                </Button>
              </div>
            </>
          )}

          <p className="text-center text-sm text-muted-foreground">
            A student?{" "}
            <Link href="/sign-up" className="underline">
              Sign up here
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
