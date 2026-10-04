/**
 * Public base URL for links we hand to Paystack (callback_url) and put in
 * billing emails. Never silently falls back to localhost in production: a
 * localhost callback means a paying student lands on a dead page.
 */
export function getAppBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.BETTER_AUTH_URL;
  if (raw) return raw.replace(/\/+$/, "");
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NEXT_PUBLIC_APP_URL is not set — refusing to build Paystack callback/receipt links that point at localhost",
    );
  }
  return "http://localhost:4001";
}
