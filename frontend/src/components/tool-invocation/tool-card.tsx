import { cn } from "lib/utils";
import type { ReactNode } from "react";

/**
 * The one card every chat tool renders in (quiz, exam, flashcards, …), so
 * they read as a family: a muted eyebrow ("Quiz · COS101"), a title, an
 * optional meta line, the body, and an optional footer bar for actions.
 */
export function ToolCard({
  icon,
  eyebrow,
  title,
  meta,
  action,
  footer,
  children,
  className,
  bodyClassName,
}: {
  icon?: ReactNode;
  eyebrow?: ReactNode;
  title?: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  const hasHeader = eyebrow || title || meta || action;
  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-card text-card-foreground",
        className,
      )}
    >
      {hasHeader && (
        <header className="flex items-start gap-3 px-5 pt-4 pb-3">
          <div className="min-w-0 flex-1">
            {eyebrow && (
              <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground [&_svg]:size-3.5">
                {icon}
                {eyebrow}
              </p>
            )}
            {title && (
              <h3 className="mt-1 text-[17px] leading-snug font-semibold tracking-[-0.015em]">
                {title}
              </h3>
            )}
            {meta && (
              <p className="mt-0.5 text-[13px] text-muted-foreground">{meta}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      {children && (
        <div className={cn("px-5 pb-5", !hasHeader && "pt-5", bodyClassName)}>
          {children}
        </div>
      )}
      {footer && (
        <footer className="flex flex-wrap items-center gap-2 border-t border-border px-5 py-3">
          {footer}
        </footer>
      )}
    </section>
  );
}

/** "COS101 · Introduction to Computing" style meta joiner. */
export function joinMeta(
  ...parts: (string | number | null | undefined | false)[]
) {
  return parts
    .filter((p) => p !== null && p !== undefined && p !== false && p !== "")
    .join(" · ");
}
