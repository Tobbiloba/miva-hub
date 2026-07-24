import { cn } from "lib/utils";
import type { ReactNode } from "react";
import { TrendPill } from "./charts";

/** KPI stat card — NexusAI pattern (design/final-decision/01).
 * Icon-in-circle, label, big value, delta pill, comparison caption. */
export function StatCard({
  icon,
  label,
  value,
  delta,
  caption = "vs last month",
  className,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  /** Percent change; positive renders green, negative red. Omit to hide. */
  delta?: number;
  caption?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-3 rounded-2xl border bg-card p-5",
        className,
      )}
    >
      <div className="flex items-center gap-2.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full border bg-background text-muted-foreground [&_svg]:size-4">
          {icon}
        </span>
        <span className="truncate text-sm text-muted-foreground">{label}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-3xl font-semibold tracking-tight">{value}</span>
        {delta !== undefined && <TrendPill delta={delta} />}
      </div>
      {caption && (
        <span className="text-xs text-muted-foreground">{caption}</span>
      )}
    </div>
  );
}
