import { cn } from "lib/utils";
import { Plus } from "lucide-react";
import type { ReactNode } from "react";

export type ChatSuggestion = {
  id: string;
  icon: ReactNode;
  title: string;
  prompt: string;
};

// Pastel icon tiles, rotated per card (design ref: Script empty state)
const TILES = [
  "bg-tint-butter text-amber-700 dark:text-amber-300",
  "bg-tint-blue text-blue-700 dark:text-blue-300",
  "bg-tint-green text-green-700 dark:text-green-300",
  "bg-tint-pink text-pink-700 dark:text-pink-300",
];

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
    <div className={cn("grid min-w-0 gap-3 sm:grid-cols-2", className)}>
      {items.map((item, i) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect(item)}
          title={item.prompt}
          className="group flex min-w-0 items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left shadow-[var(--shadow-soft)] transition-all hover:border-foreground/20 hover:shadow-[var(--shadow-float)]"
        >
          <span
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-xl [&_svg]:size-[18px]",
              TILES[i % TILES.length],
            )}
          >
            {item.icon}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-medium">
            {item.title}
          </span>
          <span className="grid size-7 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition-colors group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground">
            <Plus className="size-3.5" />
          </span>
        </button>
      ))}
    </div>
  );
}
