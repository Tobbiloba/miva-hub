/* eslint-disable react/no-unescaped-entities */
"use client";

import { useState } from "react";
import Link from "next/link";
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
import { Loader } from "lucide-react";
import { toast } from "sonner";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleResetPasswordRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to send reset link");
        return;
      }

      toast.success("If an account exists, you will receive an email shortly");
      setSubmitted(true);
    } catch (error) {
      toast.error("An error occurred. Please try again.");
      console.error("Reset password error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col p-4 md:p-8 justify-center">
      <Card className="w-full md:max-w-md bg-background border-none mx-auto shadow-none animate-in fade-in duration-1000">
        <CardHeader className="my-4">
          <CardTitle className="text-2xl text-center my-1">
            Reset Password
          </CardTitle>
          <CardDescription className="text-center text-muted-foreground">
            Enter your email address and we'll send you a link to reset your
            password.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col">
          {submitted ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-center">
                <p className="text-sm text-green-600 dark:text-green-400">
                  Check your email for a password reset link. The link will
                  expire in 1 hour.
                </p>
              </div>
              <Button asChild className="w-full">
                <Link href="/sign-in">Back to Sign In</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleResetPasswordRequest} className="space-y-6">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  autoFocus
                  disabled={loading}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  placeholder="user@example.com"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full gap-2"
              >
                {loading && <Loader className="w-4 h-4 animate-spin" />}
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>

              <div className="text-center text-sm">
                <span className="text-muted-foreground">Remember your password? </span>
                <Link
                  href="/sign-in"
                  className="text-primary hover:underline font-medium"
                >
                  Sign In
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
