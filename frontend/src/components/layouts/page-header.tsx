import { cn } from "lib/utils";
import type { ReactNode } from "react";

/** Title row for the pages inside the app panel (My Courses, Deadlines, …). */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.028em]">
          {title}
        </h1>
        {description && (
          <p className="mt-1 max-w-2xl text-[15px] text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </div>
  );
}
