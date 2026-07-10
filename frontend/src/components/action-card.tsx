import { cn } from "lib/utils";
import { Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "ui/button";

/** Next-best-action card — FIREBURN "Amplify" pattern
 * (design/final-decision/06). `recommended` inverts the card to primary and
 * shows an AI badge: exactly one card in a row should carry it. */
export function ActionCard({
  icon,
  title,
  description,
  ctaLabel,
  onAction,
  recommended = false,
  className,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  ctaLabel: string;
  onAction?: () => void;
  recommended?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-3 rounded-2xl border p-5",
        recommended
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-card",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            "flex size-10 items-center justify-center rounded-xl [&_svg]:size-5",
            recommended
              ? "bg-primary-foreground/15"
              : "border bg-background text-muted-foreground",
          )}
        >
          {icon}
        </span>
        {recommended && (
          <span className="inline-flex items-center gap-1 rounded-full bg-energy px-2 py-0.5 text-xs font-medium text-energy-foreground">
            <Sparkles className="size-3" />
            AI pick
          </span>
        )}
      </div>
      <div className="space-y-1">
        <h4 className="font-semibold">{title}</h4>
        <p
          className={cn(
            "line-clamp-3 text-sm",
            recommended ? "text-primary-foreground/80" : "text-muted-foreground",
          )}
        >
          {description}
        </p>
      </div>
      <Button
        variant={recommended ? "secondary" : "outline"}
        className="mt-auto w-full"
        onClick={onAction}
      >
        {ctaLabel}
      </Button>
    </div>
  );
}
