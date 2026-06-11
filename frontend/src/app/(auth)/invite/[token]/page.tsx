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
import { AlertCircle, GraduationCap, Loader } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface InviteInfo {
  email: string;
  name: string | null;
  position: string;
  department: string | null;
  universityName: string;
  expiresAt: string;
}

export default function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/invite/${token}`)
      .then(async (r) => {
        const data = await r.json();
        if (r.ok) {
          setInvite(data.invite);
          if (data.invite.name) setName(data.invite.name);
        } else {
          setLoadError(data.error || "Invalid invitation");
        }
      })
      .catch(() => setLoadError("Failed to load invitation"))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async () => {
    if (name.trim().length < 2) {
      setError("Enter your full name");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setError("");
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/invite/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), password }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        router.push("/");
      } else {
        setError(data.error || "Failed to accept invitation");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-full py-12">
        <Loader className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (loadError || !invite) {
    return (
      <div className="flex items-center justify-center min-h-full py-12">
        <Card className="w-full max-w-md border-none shadow-none">
          <CardHeader className="text-center">
            <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-2" />
            <CardTitle>Invitation unavailable</CardTitle>
            <CardDescription>{loadError}</CardDescription>
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
            <GraduationCap className="h-4 w-4" />
            <span>Faculty invitation</span>
          </div>
          <CardTitle className="text-2xl">
            Join {invite.universityName}
          </CardTitle>
          <CardDescription>
            You&apos;ve been invited as{" "}
            <strong>{invite.position.replace(/_/g, " ")}</strong>
            {invite.department ? ` in ${invite.department}` : ""}. Set up your
            account for <strong>{invite.email}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              placeholder="e.g. Dr. Jane Smith"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
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

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              "Accept invitation"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
