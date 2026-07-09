"use client";

import { Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";

const DISMISS_KEY = "askly_welcome_banner_dismissed";

interface WelcomeBannerProps {
  createdAt: string; // ISO timestamp of account creation
  firstName: string;
}

export function WelcomeBanner({ createdAt, firstName }: WelcomeBannerProps) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    // Don't show if account is older than 24 hours
    const accountAge = Date.now() - new Date(createdAt).getTime();
    if (accountAge > 24 * 60 * 60 * 1000) return;

    // Don't show if dismissed this session
    if (sessionStorage.getItem(DISMISS_KEY)) return;

    setDismissed(false);
  }, [createdAt]);

  if (dismissed) return null;

  function handleDismiss() {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  return (
    <div className="bg-blue-50 border-b border-blue-200 px-4 py-3 dark:bg-blue-950/30 dark:border-blue-800">
      <div className="flex items-start justify-between gap-3 max-w-5xl mx-auto">
        <div className="flex items-start gap-2 text-blue-800 dark:text-blue-200 text-sm">
          <Sparkles className="h-4 w-4 shrink-0 mt-0.5" />
          <p>
            Your study tools are ready, {firstName}. We&apos;ve started a
            flashcard deck for you to try. Take a look around — and ask Askly
            anything in the chat.
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 shrink-0"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
