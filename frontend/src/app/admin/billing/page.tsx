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
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Loader2,
  Users,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

interface OrgBilling {
  universityName: string;
  subscription: {
    id: string;
    status: string;
    seatLimit: number;
    interval: string;
    pricePerSeatNgn: number;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    isComped: boolean;
  } | null;
  covered: boolean;
  seatsUsed: number;
  overSeatLimit: boolean;
  pricing: { monthly: number; yearly: number };
}

const naira = (kobo: number) => `₦${(kobo / 100).toLocaleString()}`;

function BillingPageInner() {
  const [billing, setBilling] = useState<OrgBilling | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const [seats, setSeats] = useState("100");
  const [interval, setInterval] = useState<"monthly" | "yearly">("yearly");

  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const error = searchParams.get("error");
    if (searchParams.get("success")) {
      toast({
        title: "Payment confirmed",
        description: "Your university subscription is active.",
      });
      router.replace("/admin/billing");
    } else if (error) {
      toast({
        title: "Payment issue",
        description:
          error === "payment_failed"
            ? "The payment was not successful."
            : "We couldn't verify the payment. Contact support if you were charged.",
        variant: "destructive",
      });
      router.replace("/admin/billing");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetch("/api/admin/billing/status")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setBilling(data.data);
      })
      .catch(() => {
        toast({
          title: "Error",
          description: "Failed to load billing status",
          variant: "destructive",
        });
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const seatCount = Number.parseInt(seats, 10) || 0;
  const pricePerSeat = billing?.pricing?.[interval] ?? 0;
  const total = seatCount * pricePerSeat;

  const handlePay = async () => {
    if (seatCount < 1) {
      toast({
        title: "Invalid seats",
        description: "Enter at least 1 seat",
        variant: "destructive",
      });
      return;
    }
    setIsPaying(true);
    try {
      const response = await fetch("/api/admin/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seats: seatCount, interval }),
      });
      const data = await response.json();
      if (data.success && data.data?.authorization_url) {
        window.location.href = data.data.authorization_url;
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to start checkout",
          variant: "destructive",
        });
        setIsPaying(false);
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to start checkout",
        variant: "destructive",
      });
      setIsPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const sub = billing?.subscription;

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-primary" />
          University Billing
        </h1>
        <p className="text-muted-foreground text-sm">
          Cover all your students with a per-seat subscription — no individual
          student payments needed.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Coverage
            {billing?.covered ? (
              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                active
              </Badge>
            ) : (
              <Badge variant="outline">{sub?.status || "none"}</Badge>
            )}
            {sub?.isComped && <Badge variant="secondary">complimentary</Badge>}
          </CardTitle>
          <CardDescription>
            {billing?.covered && sub?.currentPeriodEnd
              ? `Students are covered until ${new Date(sub.currentPeriodEnd).toLocaleDateString()}.`
              : "Students currently rely on trials or individual subscriptions."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="border rounded-md px-4 py-3">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Users className="h-4 w-4" />
                Seats used
              </p>
              <p className="text-2xl font-bold">
                {billing?.seatsUsed ?? 0}
                {sub && (
                  <span className="text-base font-normal text-muted-foreground">
                    {" "}
                    / {sub.seatLimit}
                  </span>
                )}
              </p>
            </div>
            <div className="border rounded-md px-4 py-3">
              <p className="text-sm text-muted-foreground">Plan</p>
              <p className="text-2xl font-bold">
                {sub ? `${naira(sub.pricePerSeatNgn)}/seat` : "—"}
                {sub && (
                  <span className="text-base font-normal text-muted-foreground">
                    {" "}
                    {sub.interval}
                  </span>
                )}
              </p>
            </div>
          </div>
          {billing?.overSeatLimit && (
            <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                You have more students than purchased seats. Students stay
                covered, but please top up seats at your next renewal.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {billing?.covered ? "Renew or extend" : "Purchase seats"}
          </CardTitle>
          <CardDescription>
            Prepaid per-seat coverage. Renewing while active extends your
            current period — no days are lost.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="seats">Number of seats</Label>
              <Input
                id="seats"
                type="number"
                min={1}
                value={seats}
                onChange={(e) => setSeats(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Billing period</Label>
              <Select
                value={interval}
                onValueChange={(v) => setInterval(v as "monthly" | "yearly")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">
                    Monthly — {naira(billing?.pricing.monthly ?? 0)}/seat
                  </SelectItem>
                  <SelectItem value="yearly">
                    Yearly — {naira(billing?.pricing.yearly ?? 0)}/seat
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between border rounded-md px-4 py-3">
            <span className="text-sm text-muted-foreground">
              {seatCount} seats × {naira(pricePerSeat)} ({interval})
            </span>
            <span className="text-xl font-bold">{naira(total)}</span>
          </div>
          <Button onClick={handlePay} disabled={isPaying} className="w-full">
            {isPaying ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <CreditCard className="h-4 w-4 mr-1" />
            )}
            Pay with Paystack
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminBillingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      }
    >
      <BillingPageInner />
    </Suspense>
  );
}
