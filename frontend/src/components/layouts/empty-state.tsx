import { cn } from "lib/utils";
import type { ReactNode } from "react";

/** The one empty state used across the study pages. */
export function EmptyState({
  icon,
  title,
  children,
  action,
  className,
}: {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-xl border border-dashed border-input px-6 py-12 text-center",
        className,
      )}
    >
      <span className="text-muted-foreground [&_svg]:size-7 [&_svg]:stroke-[1.5]">
        {icon}
      </span>
      <p className="mt-3 text-[15px] font-semibold">{title}</p>
      {children && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {children}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
