import { test, expect, Page } from "@playwright/test";

/**
 * Phase 2A: Auth flows — login, wrong password, logout.
 * Uses Ada's seeded credentials (read-only — never writes to her row).
 *
 * Auth uses browser-side fetch to /api/auth/sign-in/email so the session
 * cookie is set in the browser's cookie jar (not Playwright's Node-side
 * request context). This bypasses the BETTER_AUTH_URL port mismatch that
 * breaks form-based login redirects.
 */

const ADA_EMAIL = "ada.okonkwo@miva.edu.ng";
const ADA_PASSWORD = "TestPass123!";

/** Sign in via browser-side fetch — sets session cookie in browser. */
async function browserSignIn(page: Page, email: string, password: string) {
  // Need a page loaded first so we can run evaluate
  await page.goto("/sign-in");
  const result = await page.evaluate(
    async ({ email, password }) => {
      const res = await fetch("/api/auth/sign-in/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });
      return { ok: res.ok, status: res.status };
    },
    { email, password }
  );
  return result;
}

test.describe("Phase 2A: Auth", () => {
  test("login as Ada → authenticated, sees her name on dashboard", async ({
    page,
  }) => {
    const res = await browserSignIn(page, ADA_EMAIL, ADA_PASSWORD);
    expect(res.ok).toBe(true);

    // Navigate to dashboard — session cookie is set in browser
    await page.goto("/student/dashboard");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Ada's name should appear (greeting, sidebar, or header)
    await expect(page.getByText(/ada/i).first()).toBeVisible({ timeout: 10000 });
  });

  test("login with wrong password → error response", async ({ page }) => {
    const res = await browserSignIn(page, ADA_EMAIL, "WrongPassword999!");
    expect(res.ok).toBe(false);
  });

  test("logout → protected page redirects to sign-in", async ({ page }) => {
    // Sign in first
    await browserSignIn(page, ADA_EMAIL, ADA_PASSWORD);

    // Sign out via browser-side fetch
    await page.evaluate(async () => {
      await fetch("/api/auth/sign-out", {
        method: "POST",
        credentials: "include",
      });
    });

    // Protected page should redirect to sign-in
    await page.goto("/student/dashboard");
    await page.waitForURL(/sign-in/, { timeout: 10000 });
    expect(page.url()).toContain("sign-in");
  });
});
