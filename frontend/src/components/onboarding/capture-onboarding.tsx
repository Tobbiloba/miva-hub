"use client";

import type { CaptureOnboardingStatus } from "@/lib/onboarding/capture-status";
import { cn } from "lib/utils";
import { CheckCircle2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "ui/button";

const INSTALL_URL = process.env.NEXT_PUBLIC_EXTENSION_INSTALL_URL;
const DISMISS_KEY = "askly:capture-onboarding-done";

/**
 * First-run path on the empty chat: Askly answers from what the student
 * captures, so until they've captured something this is the first thing they
 * see. Once they have, it shows a one-time "you're set up" until dismissed.
 */
export function CaptureOnboarding({
  status,
}: {
  status: CaptureOnboardingStatus;
}) {
  // Only the finished state is dismissible, so the hidden default can't hide
  // the setup steps from a student who still needs them.
  const [dismissed, setDismissed] = useState(true);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (status.hasCaptured) {
    if (dismissed) return null;
    return (
      <div
        role="status"
        className="mx-auto flex w-full max-w-3xl items-center gap-3 rounded-xl border bg-card px-4 py-3 text-sm"
      >
        <CheckCircle2 className="size-5 shrink-0 text-success" aria-hidden />
        <p className="flex-1">
          You&apos;re set up.{" "}
          {status.capturedCount > 0
            ? `${status.capturedCount} item${status.capturedCount === 1 ? "" : "s"} captured`
            : "Your first capture is processing"}
          , ask me anything about your courses.
        </p>
        <Button
          variant="ghost"
          size="icon"
          className="size-11 shrink-0"
          aria-label="Dismiss"
          onClick={() => {
            setDismissed(true);
            try {
              localStorage.setItem(DISMISS_KEY, "1");
            } catch {}
          }}
        >
          <X className="size-4" />
        </Button>
      </div>
    );
  }

  const steps = [
    {
      done: status.hasCourses,
      title: "Add your courses",
      body: "Askly only reads content for courses you've added.",
      action: (
        <Button asChild size="sm" variant="outline">
          <Link href="/student/courses/browse">Add courses</Link>
        </Button>
      ),
    },
    {
      done: false,
      title: "Install Askly Capture",
      body: "Our Chrome extension. Sign in to it with your Askly email and password.",
      action: INSTALL_URL ? (
        <Button asChild size="sm" variant="outline">
          <a href={INSTALL_URL} target="_blank" rel="noopener noreferrer">
            Get the extension
          </a>
        </Button>
      ) : null,
    },
    {
      done: false,
      title: "Capture your first lecture",
      body: "Open a lecture video or PDF on your LMS and press Capture. Askly will answer from it.",
      action: null,
    },
  ];

  const doneCount = steps.filter((step) => step.done).length;
  const next = steps.find((step) => !step.done) ?? steps[steps.length - 1];

  return (
    <section
      aria-labelledby="capture-onboarding-title"
      className="mx-auto w-full max-w-3xl rounded-xl border bg-card"
    >
      <div className="flex items-center gap-4 px-4 py-3.5">
        <div className="min-w-0 flex-1">
          <h2
            id="capture-onboarding-title"
            className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground"
          >
            <span className="flex gap-1" aria-hidden>
              {steps.map((step) => (
                <span
                  key={step.title}
                  className={cn(
                    "h-1 w-4 rounded-full",
                    step.done ? "bg-brand" : "bg-input",
                  )}
                />
              ))}
            </span>
            Set up Askly · {doneCount} of {steps.length}
          </h2>
          <p className="mt-1 text-sm font-medium">{next.title}</p>
          <p className="text-[13px] text-muted-foreground">{next.body}</p>
        </div>
        {next.action && (
          <div className="hidden shrink-0 sm:block">{next.action}</div>
        )}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="shrink-0 rounded-md px-2 py-1 text-[13px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          {expanded ? "Hide steps" : "All steps"}
        </button>
      </div>
      {expanded && (
        <ol className="divide-y border-t">
          {steps.map((step, i) => (
            <li key={step.title} className="flex items-center gap-3 px-4 py-3">
              {step.done ? (
                <CheckCircle2
                  className="size-5 shrink-0 text-success"
                  aria-label="Done"
                />
              ) : (
                <span
                  className="grid size-5 shrink-0 place-items-center rounded-full border text-[11px] font-semibold text-muted-foreground"
                  aria-label="Not done"
                >
                  {i + 1}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-sm font-medium",
                    step.done && "text-muted-foreground line-through",
                  )}
                >
                  {step.title}
                </p>
                <p className="text-[13px] text-muted-foreground">{step.body}</p>
              </div>
              {!step.done && step.action}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
