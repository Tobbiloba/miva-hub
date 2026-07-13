"use client";

import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

/**
 * Toggles a student's volunteer flag — volunteers can ingest course content
 * via the Askly Capture browser extension.
 */
export function VolunteerToggle({
  studentId,
  studentName,
  initialValue,
}: {
  studentId: string;
  studentName: string;
  initialValue: boolean;
}) {
  const [enabled, setEnabled] = useState(initialValue);
  const [pending, setPending] = useState(false);

  async function toggle(next: boolean) {
    setPending(true);
    setEnabled(next); // optimistic
    try {
      const res = await fetch(`/api/admin/students/${studentId}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isVolunteer: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEnabled(!next);
        toast.error(data.error ?? "Failed to update volunteer status");
        return;
      }
      toast.success(
        next
          ? `${studentName} can now capture content with the extension`
          : `Volunteer access removed for ${studentName}`,
      );
    } catch {
      setEnabled(!next);
      toast.error("Network error — please try again");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Switch
        checked={enabled}
        disabled={pending}
        onCheckedChange={toggle}
        aria-label={`Toggle volunteer access for ${studentName}`}
      />
      {pending && (
        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
      )}
    </div>
  );
}
