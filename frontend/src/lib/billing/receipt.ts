import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { getAppBaseUrl } from "@/lib/billing/app-url";
import { PLAN_FEATURES, formatNaira } from "@/lib/billing/plans";
import { sendEmail } from "@/lib/email/smtp-service";
import { escapeHtml } from "@/lib/escape-html";

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-NG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Payment receipt for an individual plan charge. Plan name, amount, period
 * and features all come from the plan row / the verified charge — nothing
 * here is plan-specific. Best effort: a failed email never fails billing.
 */
export async function sendPaymentReceiptEmail(opts: {
  to: string;
  userName: string | null;
  plan: {
    displayName: string;
    interval: string;
    features: string[] | null;
  };
  amountKobo: number;
  reference: string;
  paidAt: Date;
  periodEnd: Date;
}) {
  try {
    const template = await readFile(
      path.join(process.cwd(), "src/lib/email/templates/payment-receipt.html"),
      "utf-8",
    );

    const features =
      opts.plan.features && opts.plan.features.length > 0
        ? opts.plan.features
        : [...PLAN_FEATURES];
    const featureList = features
      .map((f) => `<li>${escapeHtml(f)}</li>`)
      .join("\n        ");
    const billingPeriod =
      opts.plan.interval === "yearly" ? "Yearly" : "Monthly";
    const amount = formatNaira(opts.amountKobo);

    const html = template
      .replace(/{{userName}}/g, escapeHtml(opts.userName || "there"))
      .replace(/{{planName}}/g, escapeHtml(opts.plan.displayName))
      .replace(/{{amount}}/g, amount)
      .replace(/{{billingPeriod}}/g, billingPeriod)
      .replace(/{{transactionId}}/g, escapeHtml(opts.reference))
      .replace(/{{paymentDate}}/g, formatDate(opts.paidAt))
      .replace(/{{periodEnd}}/g, formatDate(opts.periodEnd))
      .replace(/{{featureList}}/g, featureList)
      .replace(/{{appUrl}}/g, getAppBaseUrl());

    await sendEmail({
      to: opts.to,
      subject: `Payment confirmation: ${opts.plan.displayName} (${amount})`,
      html,
    });
  } catch (error) {
    console.error("[Billing] receipt email failed:", error);
  }
}
