import { cn } from "lib/utils";

/** Askly mark: a solid brand tile with the initial. Stands in until the
 * final logo artwork lands; swap the tile contents, keep the API. */
export function LogoBox({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-lg bg-primary font-display text-sm font-bold text-primary-foreground",
        className,
      )}
    >
      A
    </div>
  );
}

/** Mark + wordmark, as used in the app sidebar and the landing navbar. */
export function AsklyLogo({
  className,
  markClassName,
}: { className?: string; markClassName?: string }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <LogoBox className={cn("size-7", markClassName)} />
      <span className="font-display text-lg font-bold tracking-tight">
        Askly
      </span>
    </span>
  );
}
