import { cn } from "lib/utils";
import type { ReactNode } from "react";

export type ChatSuggestion = {
  id: string;
  icon: ReactNode;
  title: string;
  /** One short line under the title */
  hint: string;
  prompt: string;
};

/** Empty-state starters under the greeting; clicking one sends the prompt. */
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
    <div className={cn("grid min-w-0 gap-2.5 sm:grid-cols-2", className)}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect(item)}
          title={item.prompt}
          className="group flex min-w-0 items-start gap-3 rounded-xl border border-border bg-card px-4 py-3.5 text-left transition-colors duration-150 hover:bg-accent/60"
        >
          <span className="mt-px shrink-0 text-muted-foreground transition-colors group-hover:text-foreground [&_svg]:size-[18px]">
            {item.icon}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-medium leading-5">
              {item.title}
            </span>
            <span className="block truncate text-[13px] leading-5 text-muted-foreground">
              {item.hint}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}
