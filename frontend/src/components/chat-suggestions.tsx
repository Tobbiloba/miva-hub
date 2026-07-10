import { cn } from "lib/utils";
import type { ReactNode } from "react";

export type ChatSuggestion = {
  id: string;
  icon: ReactNode;
  title: string;
  prompt: string;
};

/** Empty-state suggestion cards — EchoAi pattern (design/final-decision/02).
 * Rendered under the greeting before the first message; clicking one
 * pre-fills / sends the prompt. */
export function SuggestionCards({
  items,
  onSelect,
  className,
}: {
  items: ChatSuggestion[];
  onSelect: (suggestion: ChatSuggestion) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect(item)}
          className="group flex min-w-0 flex-col items-start gap-3 rounded-2xl border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-accent"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground [&_svg]:size-4">
            {item.icon}
          </span>
          <span className="min-w-0 space-y-1">
            <span className="block text-sm font-medium leading-snug">
              {item.title}
            </span>
            <span className="line-clamp-2 block text-xs text-muted-foreground">
              {item.prompt}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}
