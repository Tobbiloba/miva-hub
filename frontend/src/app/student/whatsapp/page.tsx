"use client";

import { CheckCircle2, Loader2, MessageCircle, Unlink } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LinkStatus {
  linked: boolean;
  phoneNumber: string | null;
  pendingCode: string | null;
}

export default function WhatsAppPage() {
  const [status, setStatus] = useState<LinkStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const refresh = useCallback(() => {
    fetch("/api/student/whatsapp")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(setStatus)
      .catch(() => toast.error("Failed to load WhatsApp status"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const generateCode = async () => {
    setWorking(true);
    try {
      const res = await fetch("/api/student/whatsapp", { method: "POST" });
      if (!res.ok) throw new Error();
      refresh();
    } catch {
      toast.error("Failed to generate code");
    } finally {
      setWorking(false);
    }
  };

  const unlink = async () => {
    setWorking(true);
    try {
      const res = await fetch("/api/student/whatsapp", { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("WhatsApp unlinked");
      refresh();
    } catch {
      toast.error("Failed to unlink");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageCircle className="h-6 w-6 text-green-600" />
          Study on WhatsApp
        </h1>
        <p className="text-muted-foreground">
          Ask your course tutor questions from WhatsApp — short, data-friendly
          answers grounded in your actual course materials.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Connection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : status?.linked ? (
            <>
              <p className="text-sm flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Linked to +{status.phoneNumber}
              </p>
              <p className="text-sm text-muted-foreground">
                On WhatsApp, send <strong>COURSES</strong> to list your courses,{" "}
                <strong>USE 1</strong> to pick one, then just ask questions.
              </p>
              <Button variant="outline" onClick={unlink} disabled={working}>
                <Unlink className="mr-2 h-4 w-4" />
                Unlink this number
              </Button>
            </>
          ) : (
            <>
              {status?.pendingCode ? (
                <div className="rounded-lg border bg-muted/40 p-4 text-center space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Send this message to the Askly WhatsApp number:
                  </p>
                  <p className="font-mono text-xl font-bold tracking-widest">
                    LINK {status.pendingCode}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    The code expires in 15 minutes.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Generate a linking code, then send it to the Askly WhatsApp
                  number to connect your account.
                </p>
              )}
              <Button onClick={generateCode} disabled={working}>
                {working ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <MessageCircle className="mr-2 h-4 w-4" />
                )}
                {status?.pendingCode ? "Generate a new code" : "Generate code"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
