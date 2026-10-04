/**
 * Retired: this used to write PRO/MAX plan codes from env vars. The live
 * plans are ASKLY_MONTHLY / ASKLY_YEARLY and their codes are written by
 * setup-paystack-plans.ts. Kept only so `pnpm paystack:update-codes` fails
 * with a pointer instead of writing legacy codes.
 */
console.error(
  "update-plan-codes is retired. Run: pnpm tsx scripts/setup-paystack-plans.ts",
);
process.exit(1);
