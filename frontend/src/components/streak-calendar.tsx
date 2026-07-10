import { cn } from "lib/utils";

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

/** Study-streak month grid — NexusAI "Usage Streak" pattern
 * (design/final-decision/01). `days` = day-of-month numbers that count. */
export function StreakCalendar({
  monthDays = 28,
  activeDays,
  streakCount,
  className,
}: {
  monthDays?: number;
  activeDays: number[];
  streakCount: number;
  className?: string;
}) {
  const active = new Set(activeDays);
  return (
    <div className={cn("min-w-0 space-y-3", className)}>
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-semibold tracking-tight">
          {streakCount}
        </span>
        <span className="text-sm text-muted-foreground">day streak</span>
      </div>
      <div className="grid grid-cols-7 gap-1.5 text-center">
        {DAY_LABELS.map((d, i) => (
          <span
            key={`${d}-${i}`}
            className="text-[10px] font-medium text-muted-foreground"
          >
            {d}
          </span>
        ))}
        {Array.from({ length: monthDays }, (_, i) => i + 1).map((day) => (
          <span
            key={day}
            className={cn(
              "flex aspect-square items-center justify-center rounded-full text-[10px] tabular-nums",
              active.has(day)
                ? "bg-energy font-medium text-energy-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            {day}
          </span>
        ))}
      </div>
    </div>
  );
}
