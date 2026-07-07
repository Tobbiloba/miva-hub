import "server-only";

import { eq } from "drizzle-orm";

import { pgDb as db } from "@/lib/db/pg/db.pg";
import { subscriptionRepository } from "@/lib/db/pg/repositories/subscription-repository.pg";
import { UserSchema } from "@/lib/db/pg/schema.pg";
import { paystackService } from "@/lib/payment/paystack-service";

export type CancelSubscriptionResult =
  | { ok: true; message: string; subscription: unknown }
  | {
      ok: false;
      code: "no_subscription" | "provider_error";
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

  // Only real Paystack subscriptions (SUB_...) can/need to be disabled
  // remotely. Pseudo-codes like "charge_<ref>" have no recurring billing.
  const subCode = subscription.paystackSubscriptionCode;
  const isRealPaystackSubscription = !!subCode && subCode.startsWith("SUB_");

  if (isRealPaystackSubscription) {
    let emailToken = subscription.paystackEmailToken;

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
    if (!paystackResponse.status) {
      return {
        ok: false,
        code: "provider_error",
        message: "Failed to cancel subscription with Paystack",
      };
    }
  }

  const cancelledSubscription = await subscriptionRepository.cancelSubscription(
    subscription.id,
    !immediate,
  );

  if (immediate) {
    await db
      .update(UserSchema)
      .set({ subscriptionStatus: "cancelled", currentPlan: "FREE" })
      .where(eq(UserSchema.id, userId));
  }

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
