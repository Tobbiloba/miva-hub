import { cn } from "lib/utils";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";

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
  const up = (delta ?? 0) >= 0;
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
        {delta !== undefined && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              up
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-destructive/10 text-destructive",
            )}
          >
            {up ? (
              <TrendingUp className="size-3" />
            ) : (
              <TrendingDown className="size-3" />
            )}
            {up ? "+" : ""}
            {delta}%
          </span>
        )}
      </div>
      {caption && (
        <span className="text-xs text-muted-foreground">{caption}</span>
      )}
    </div>
  );
}
