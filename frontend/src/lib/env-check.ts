/**
 * Startup environment validation. Fails loudly in production for vars the
 * app cannot run without; warns for vars that degrade features when absent.
 */
const REQUIRED = ["POSTGRES_URL", "BETTER_AUTH_SECRET"] as const;

const RECOMMENDED: Record<string, string> = {
  NEXT_PUBLIC_APP_URL:
    "links in invite/reset emails and Paystack callbacks will point to localhost",
  PAYSTACK_SECRET_KEY: "billing checkout and webhooks will fail",
  RESEND_API_KEY: "invite, receipt, and password-reset emails will not send",
  OPENAI_API_KEY: "default AI provider unavailable",
};

export function checkEnv() {
  const isProd = process.env.NODE_ENV === "production";

  const missingRequired = REQUIRED.filter((key) => !process.env[key]);
  if (missingRequired.length > 0) {
    const msg = `Missing required environment variables: ${missingRequired.join(", ")}`;
    if (isProd) throw new Error(`[env-check] ${msg}`);
    console.warn(`⚠️ [env-check] ${msg}`);
  }

  for (const [key, consequence] of Object.entries(RECOMMENDED)) {
    if (!process.env[key]) {
      console.warn(`⚠️ [env-check] ${key} is not set — ${consequence}`);
    }
  }

  if (isProd && process.env.PAYSTACK_SECRET_KEY?.startsWith("sk_test")) {
    console.warn(
      "⚠️ [env-check] PAYSTACK_SECRET_KEY is a TEST key in production — payments will not be real",
    );
  }
}
