import {
  INDIVIDUAL_PLANS,
  PREMIUM_FEATURES,
  formatNaira,
} from "lib/billing/plans";
import { Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "ui/button";

/**
 * Shown where a Premium feature (or a Premium-sized allowance) would be, so
 * a student on the standard plan sees what Premium adds and how to get it
 * instead of a dead end.
 */
export function PremiumUpgradeCard({
  title = "Part of Askly Premium",
  description,
}: {
  title?: string;
  description?: string;
}) {
  const monthly = INDIVIDUAL_PLANS.premium_monthly;
  return (
    <div className="rounded-2xl border bg-card p-5">
      <p className="flex items-center gap-2 text-sm font-medium">
        <Sparkles className="h-4 w-4" aria-hidden="true" />
        {title}
      </p>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      )}
      <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
        {PREMIUM_FEATURES.slice(1).map((feature) => (
          <li key={feature}>· {feature}</li>
        ))}
      </ul>
      <Button asChild className="mt-4 min-h-11 w-full sm:w-auto">
        <Link href="/billing">
          Get Premium · {formatNaira(monthly.priceKobo)}/{monthly.periodLabel}
        </Link>
      </Button>
    </div>
  );
}
