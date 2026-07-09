"use client";

import { Clock, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "ui/button";

const DISMISS_KEY = "askly_trial_banner_dismissed";

export function TrialCountdownBanner() {
  const router = useRouter();
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    // Check if dismissed this session
    if (sessionStorage.getItem(DISMISS_KEY)) return;

    setDismissed(false);

    fetch("/api/billing/status")
      .then((res) => res.json())
      .then((data) => {
        if (
          data.in_trial &&
          data.days_left_in_trial >= 1 &&
          data.days_left_in_trial <= 3
        ) {
          setDaysLeft(data.days_left_in_trial);
        } else {
          setDismissed(true);
        }
      })
      .catch(() => setDismissed(true));
  }, []);

  function handleDismiss() {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  if (dismissed || daysLeft === null) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between text-sm dark:bg-amber-950/30 dark:border-amber-800">
      <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
        <Clock className="h-4 w-4 shrink-0" />
        <span>
          Your trial ends in {daysLeft} day{daysLeft !== 1 ? "s" : ""}. Upgrade
          to keep access.
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900"
          onClick={() => router.push("/billing")}
        >
          View plans
        </Button>
        <button
          onClick={handleDismiss}
          className="text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
