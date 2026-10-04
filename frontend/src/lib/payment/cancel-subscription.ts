import "server-only";

import { eq } from "drizzle-orm";

import { pgDb as db } from "@/lib/db/pg/db.pg";
import { subscriptionRepository } from "@/lib/db/pg/repositories/subscription-repository.pg";
import { UserSchema } from "@/lib/db/pg/schema.pg";
import { isPlaceholderSubscriptionCode } from "@/lib/billing/rules";
import { paystackService } from "@/lib/payment/paystack-service";

export type CancelSubscriptionResult =
  | { ok: true; message: string; subscription: unknown }
  | {
      ok: false;
      code: "no_subscription" | "already_cancelled" | "provider_error";
      message: string;
    };

/**
 * Cancel the user's active subscription — remotely disabling recurring
 * Paystack billing when applicable. Single code path shared by the billing
 * route and the AI support agent.
 */
export async function cancelSubscriptionForUser(
  userId: string,
  options: { immediate?: boolean; reason?: string } = {},
): Promise<CancelSubscriptionResult> {
  const immediate = options.immediate ?? false;

  const subscription =
    await subscriptionRepository.getUserActiveSubscription(userId);
  if (!subscription) {
    return {
      ok: false,
      code: "no_subscription",
      message: "No active subscription found",
    };
  }

  if (subscription.cancelAtPeriodEnd && !immediate) {
    return {
      ok: false,
      code: "already_cancelled",
      message:
        "Subscription is already set to cancel at the end of the period.",
    };
  }

  // Resolve the real Paystack subscription. Rows created from a charge
  // before Paystack told us the SUB_ code carry a "charge_<ref>"
  // placeholder — the recurring subscription still exists on Paystack and
  // must be disabled, so look it up via the customer instead of assuming
  // there's nothing to stop.
  let subCode: string | null = isPlaceholderSubscriptionCode(
    subscription.paystackSubscriptionCode,
  )
    ? null
    : subscription.paystackSubscriptionCode;
  let emailToken = subCode ? subscription.paystackEmailToken : null;

  try {
    if (!subCode && subscription.paystackCustomerCode) {
      const live = (
        await paystackService.getCustomerSubscriptions(
          subscription.paystackCustomerCode,
        )
      ).filter((s) => s.status === "active" || s.status === "attention");
      if (live.length > 1) {
        console.error(
          `Cancel failed: customer ${subscription.paystackCustomerCode} has ${live.length} live Paystack subscriptions`,
        );
        return {
          ok: false,
          code: "provider_error",
          message:
            "We couldn't match your subscription with our payment provider. Please contact support.",
        };
      }
      if (live[0]) {
        subCode = live[0].subscription_code;
        emailToken = live[0].email_token ?? null;
        // Replace the placeholder so future lookups/webhooks match.
        await subscriptionRepository.updateSubscription(subscription.id, {
          paystackSubscriptionCode: subCode,
          ...(emailToken ? { paystackEmailToken: emailToken } : {}),
        });
      }
    }

    if (subCode) {
      // Fallback: token was never captured (older subscriptions) — fetch it
      // from Paystack so cancellation actually stops recurring billing.
      if (!emailToken) {
        const fetched = await paystackService.getSubscription(subCode);
        emailToken = fetched?.data?.email_token ?? null;

        if (emailToken) {
          await subscriptionRepository.updateSubscription(subscription.id, {
            paystackEmailToken: emailToken,
          });
        }
      }

      if (!emailToken) {
        console.error(
          `Cancel failed: no email token available for subscription ${subscription.id} (${subCode})`,
        );
        return {
          ok: false,
          code: "provider_error",
          message:
            "Unable to cancel with our payment provider right now. Please try again or contact support.",
        };
      }

      const paystackResponse = await paystackService.disableSubscription(
        subCode,
        emailToken,
      );
      if (!paystackResponse?.status) {
        console.error(
          `Cancel failed: Paystack disable rejected ${subCode}: ${paystackResponse?.message}`,
        );
        return {
          ok: false,
          code: "provider_error",
          message:
            "Unable to cancel with our payment provider right now. Please try again or contact support.",
        };
      }
    }
  } catch (error) {
    console.error(
      `Cancel failed: Paystack error for subscription ${subscription.id}:`,
      error,
    );
    return {
      ok: false,
      code: "provider_error",
      message:
        "Unable to cancel with our payment provider right now. Please try again or contact support.",
    };
  }

  const cancelledSubscription = await subscriptionRepository.cancelSubscription(
    subscription.id,
    !immediate,
  );

  // Period-end cancel keeps paid-for access until currentPeriodEnd.
  await db
    .update(UserSchema)
    .set(
      immediate
        ? { subscriptionStatus: "cancelled", currentPlan: "FREE" }
        : { subscriptionStatus: "non_renewing" },
    )
    .where(eq(UserSchema.id, userId));

  await subscriptionRepository.logSubscriptionChange({
    userId,
    subscriptionId: subscription.id,
    changeType: "cancel",
    fromPlanId: subscription.planId,
    reason:
      options.reason ??
      (immediate ? "Immediate cancellation" : "Cancel at period end"),
  });

  return {
    ok: true,
    subscription: cancelledSubscription,
    message: immediate
      ? "Subscription cancelled immediately"
      : "Subscription will be cancelled at the end of the current period",
  };
}
