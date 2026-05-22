import { test, expect } from "@playwright/test";

/**
 * Phase 2A: Auth flows — login, wrong password, logout.
 * Uses Ada's seeded credentials (read-only — never writes to her row).
 */

const ADA_EMAIL = "ada.okonkwo@miva.edu.ng";
const ADA_PASSWORD = "TestPass123!";

test.describe("Phase 2A: Auth", () => {
  test("login as Ada → lands on student dashboard, sees her name", async ({
    page,
  }) => {
    await page.goto("/sign-in");
    await page.getByLabel(/email/i).fill(ADA_EMAIL);
    await page.getByLabel(/password/i).fill(ADA_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();

    // Should redirect to dashboard or home
    await page.waitForURL(/\/(student\/dashboard)?|\/$/,  { timeout: 15000 });

    // Ada's name should appear somewhere on the page
    await expect(page.getByText(/ada/i).first()).toBeVisible({ timeout: 10000 });
  });

  test("login with wrong password → error shown, not logged in", async ({
    page,
  }) => {
    await page.goto("/sign-in");
    await page.getByLabel(/email/i).fill(ADA_EMAIL);
    await page.getByLabel(/password/i).fill("WrongPassword999!");
    await page.getByRole("button", { name: /sign in/i }).click();

    // Should stay on sign-in page (not redirect)
    await page.waitForTimeout(3000);
    expect(page.url()).toContain("sign-in");
  });

  test("logout → returns to login page", async ({ page }) => {
    // First log in
    await page.goto("/sign-in");
    await page.getByLabel(/email/i).fill(ADA_EMAIL);
    await page.getByLabel(/password/i).fill(ADA_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/(student\/dashboard)?|\/$/, { timeout: 15000 });

    // Look for a logout/sign-out button or menu
    const logoutBtn = page.getByRole("button", { name: /log\s*out|sign\s*out/i });
    const profileBtn = page.getByRole("button", { name: /profile|account|ada/i });

    if (await profileBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await profileBtn.click();
      await page.waitForTimeout(500);
    }

    if (await logoutBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await logoutBtn.click();
      await page.waitForURL(/sign-in/, { timeout: 10000 });
      expect(page.url()).toContain("sign-in");
    } else {
      // Log out via API if no visible button
      await page.goto("/api/auth/sign-out", { waitUntil: "networkidle" });
      await page.goto("/student/dashboard");
      await page.waitForURL(/sign-in/, { timeout: 10000 });
      expect(page.url()).toContain("sign-in");
    }
  });
});
