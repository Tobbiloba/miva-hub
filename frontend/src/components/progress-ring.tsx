import { cn } from "lib/utils";

/** Circular progress ring — "five" enrolled-courses pattern
 * (design/final-decision/05). Token-driven: primary stroke on muted track. */
export function ProgressRing({
  value,
  size = 40,
  strokeWidth = 4,
  showLabel = true,
  className,
}: {
  /** 0–100 */
  value: number;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("relative inline-flex shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (clamped / 100) * c}
          className={cn(
            "transition-[stroke-dashoffset] duration-500",
            clamped >= 100 ? "stroke-energy" : "stroke-primary",
          )}
        />
      </svg>
      {showLabel && (
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium tabular-nums">
          {Math.round(clamped)}%
        </span>
      )}
    </div>
  );
}
