import { cn } from "lib/utils";
import { ArrowUpRight, BookOpen } from "lucide-react";
import type { ReactNode } from "react";

export type AnswerSource = {
  id: string;
  title: string;
  /** e.g. "Lecture 4 slides", "Course notes", "arxiv.org" */
  origin: string;
  href?: string;
  icon?: ReactNode;
};

/** Compact citation card — answer-richness pattern
 * (design/final-decision/04). Rendered in a horizontal row above/below
 * an AI answer that cites course material or the web. */
export function SourceCard({
  source,
  index,
  className,
}: {
  source: AnswerSource;
  index: number;
  className?: string;
}) {
  const Comp = source.href ? "a" : "div";
  return (
    <Comp
      {...(source.href
        ? { href: source.href, target: "_blank", rel: "noopener noreferrer" }
        : {})}
      className={cn(
        "group flex w-52 shrink-0 flex-col gap-2 rounded-xl border bg-card p-3 transition-colors",
        source.href && "hover:border-primary/40 hover:bg-accent",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-medium tabular-nums text-primary">
          {index}
        </span>
        <span className="flex min-w-0 items-center gap-1 truncate text-[11px] text-muted-foreground [&_svg]:size-3">
          {source.icon ?? <BookOpen />}
          <span className="truncate">{source.origin}</span>
        </span>
        {source.href && (
          <ArrowUpRight className="ml-auto size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        )}
      </div>
      <p className="line-clamp-2 text-xs font-medium leading-snug">
        {source.title}
      </p>
    </Comp>
  );
}

/** Horizontal scroll row of SourceCards with a count label. */
export function SourceCardRow({
  sources,
  className,
}: {
  sources: AnswerSource[];
  className?: string;
}) {
  if (sources.length === 0) return null;
  return (
    <div className={cn("min-w-0 space-y-2", className)}>
      <p className="text-xs font-medium text-muted-foreground">
        {sources.length} source{sources.length === 1 ? "" : "s"}
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {sources.map((s, i) => (
          <SourceCard key={s.id} source={s} index={i + 1} />
        ))}
      </div>
    </div>
  );
}
