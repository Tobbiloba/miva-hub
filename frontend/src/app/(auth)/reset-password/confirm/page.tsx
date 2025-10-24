"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
import { Loader, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export default function ConfirmResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = searchParams.get("token");
  const email = searchParams.get("email");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isValid, setIsValid] = useState(true);

  useEffect(() => {
    if (!token || !email) {
      setIsValid(false);
    }
  }, [token, email]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      toast.error("Please enter both passwords");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(
          data.error ||
            "Failed to reset password. The link may have expired."
        );
        return;
      }

      toast.success("Password reset successfully!");
      setTimeout(() => {
        router.push("/sign-in");
      }, 1000);
    } catch (error) {
      toast.error("An error occurred. Please try again.");
      console.error("Password reset error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isValid) {
    return (
      <div className="w-full h-full flex flex-col p-4 md:p-8 justify-center">
        <Card className="w-full md:max-w-md bg-background border-none mx-auto shadow-none animate-in fade-in duration-1000">
          <CardHeader className="my-4">
            <CardTitle className="text-2xl text-center my-1 text-destructive">
              Invalid Reset Link
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                The password reset link is invalid or has expired. Please
                request a new one.
              </p>
              <Button asChild className="w-full">
                <Link href="/reset-password">Request New Link</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/sign-in">Back to Sign In</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col p-4 md:p-8 justify-center">
      <Card className="w-full md:max-w-md bg-background border-none mx-auto shadow-none animate-in fade-in duration-1000">
        <CardHeader className="my-4">
          <CardTitle className="text-2xl text-center my-1">
            Set New Password
          </CardTitle>
          <CardDescription className="text-center text-muted-foreground">
            Enter your new password below. Make sure it is at least 8 characters
            long.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col">
          <form onSubmit={handleResetPassword} className="space-y-6">
            <div className="grid gap-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  autoFocus
                  disabled={loading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  disabled={loading}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  disabled={loading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full gap-2">
              {loading && <Loader className="w-4 h-4 animate-spin" />}
              {loading ? "Resetting..." : "Reset Password"}
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
        </CardContent>
      </Card>
    </div>
  );
}
