"use client";

import { type ToolUIPart } from "ai";
import { Loader, Mic, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { Button } from "ui/button";

type VoiceSessionOutput = {
  url?: string;
  courseCode?: string;
  courseTitle?: string;
  mode?: "tutor" | "viva";
  focusTopic?: string | null;
  minutesLeft?: number;
  error?: string;
};

/**
 * What start-voice-session shows in chat: a card with one button that opens
 * the Voice Coach with the course, mode and topic already set.
 */
export function VoiceSessionCard({ part }: { part: ToolUIPart }) {
  const output = (
    part.state === "output-available" ? part.output : null
  ) as VoiceSessionOutput | null;

  if (part.state === "output-error" || output?.error) {
    return (
      <div
        role="status"
        className="flex items-center gap-2 text-[13px] text-muted-foreground"
      >
        <TriangleAlert className="size-3.5 text-destructive" aria-hidden />
        {output?.error
          ? `Couldn't set up a voice session: ${output.error}`
          : "Couldn't set up a voice session"}
      </div>
    );
  }

  if (!output?.url) {
    return (
      <div
        role="status"
        className="flex items-center gap-2 text-[13px] text-muted-foreground"
      >
        <Loader className="size-3.5 animate-spin" aria-hidden />
        Setting up your voice session
      </div>
    );
  }

  const viva = output.mode === "viva";
  return (
    <div className="flex w-full max-w-md items-center gap-3 rounded-2xl border bg-card p-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary">
        <Mic className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">
          {viva ? "Mock viva" : "Voice tutor"} · {output.courseCode}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {output.focusTopic || output.courseTitle}
          {typeof output.minutesLeft === "number" &&
            ` · ${output.minutesLeft >= 1 ? `${output.minutesLeft} min` : "under a minute"} left`}
        </p>
      </div>
      <Button asChild size="sm" className="min-h-11 shrink-0">
        <Link href={output.url}>{viva ? "Start viva" : "Start talking"}</Link>
      </Button>
    </div>
  );
}
