"use client";

import { cn } from "lib/utils";
import { RotateCw } from "lucide-react";

/** Long answers get a smaller face so a card never needs to scroll. */
function faceText(text: string) {
  if (text.length > 220) return "text-[15px] leading-relaxed font-normal";
  if (text.length > 110) return "text-lg leading-snug font-medium";
  return "text-[22px] leading-snug font-semibold tracking-[-0.02em]";
}

/**
 * One study card that turns over in 3D. Used by the chat flashcards tool and
 * the review page, so a card looks the same wherever a student meets it.
 * Both faces share one grid cell, so the card grows to fit the longer side
 * instead of clipping it. A deck edge peeks out underneath while more follow.
 */
export function FlipCard({
  front,
  back,
  flipped,
  onFlip,
  position,
  stacked = false,
  className,
}: {
  front: string;
  back: string;
  flipped: boolean;
  onFlip: () => void;
  /** "3 of 12" style counter shown on both faces */
  position?: string;
  stacked?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("relative", stacked && "pb-3", className)}>
      {stacked && (
        <>
          <div
            aria-hidden
            className="absolute inset-x-6 bottom-0 h-8 rounded-b-2xl border border-t-0 border-border bg-card/60"
          />
          <div
            aria-hidden
            className="absolute inset-x-3 bottom-1.5 h-8 rounded-b-2xl border border-t-0 border-border bg-card"
          />
        </>
      )}
      <button
        type="button"
        onClick={onFlip}
        aria-pressed={flipped}
        aria-label={
          flipped ? `Answer: ${back}` : `Question: ${front}. Show the answer`
        }
        className="group relative block h-full min-h-[inherit] w-full cursor-pointer rounded-2xl text-left perspective-1000 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <div
          className={cn(
            "relative grid h-full min-h-[inherit] w-full transition-transform duration-[650ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] transform-style-3d motion-reduce:duration-0",
            flipped && "rotate-y-180",
          )}
        >
          {/* Front */}
          <div className="flex min-h-[inherit] flex-col rounded-2xl border border-border bg-card p-6 backface-hidden [grid-area:1/1] transition-colors group-hover:border-input">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-medium">Question</span>
              {position && <span className="tabular-nums">{position}</span>}
            </div>
            <p
              className={cn(
                "m-auto max-w-[34ch] py-4 text-center text-balance",
                faceText(front),
              )}
            >
              {front}
            </p>
            <span className="mx-auto inline-flex items-center gap-1.5 text-xs text-muted-foreground opacity-80 transition-opacity group-hover:opacity-100">
              <RotateCw className="size-3" />
              Tap to see the answer
            </span>
          </div>

          {/* Back */}
          <div className="flex min-h-[inherit] flex-col rounded-2xl border border-brand/20 bg-tint-blue p-6 rotate-y-180 backface-hidden [grid-area:1/1]">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-brand">Answer</span>
              {position && (
                <span className="tabular-nums text-muted-foreground">
                  {position}
                </span>
              )}
            </div>
            <p
              className={cn(
                "m-auto max-w-[42ch] py-4 text-center text-pretty",
                faceText(back),
              )}
            >
              {back}
            </p>
            <p className="mx-auto line-clamp-1 max-w-[46ch] text-center text-xs text-muted-foreground">
              {front}
            </p>
          </div>
        </div>
      </button>
    </div>
  );
}

/** Thin segmented progress: one segment per card, filled up to `current`. */
export function CardProgress({
  total,
  current,
  className,
}: {
  total: number;
  current: number;
  className?: string;
}) {
  // Past ~24 cards segments get too thin; fall back to one continuous bar
  if (total > 24) {
    return (
      <div
        className={cn(
          "h-1 w-full overflow-hidden rounded-full bg-secondary",
          className,
        )}
      >
        <div
          className="h-full rounded-full bg-brand transition-[width] duration-500 ease-out"
          style={{ width: `${(Math.min(current, total) / total) * 100}%` }}
        />
      </div>
    );
  }
  return (
    <div className={cn("flex w-full gap-1", className)} aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-1 flex-1 rounded-full transition-colors duration-300",
            i < current ? "bg-brand" : "bg-secondary",
          )}
        />
      ))}
    </div>
  );
}
