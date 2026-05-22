import { test, expect } from "@playwright/test";

/**
 * Phase 2C: Navigation renders — visit key pages as Ada, assert no crash + key element.
 * Read-only against Ada's data — never writes.
 */

const ADA_EMAIL = "ada.okonkwo@miva.edu.ng";
const ADA_PASSWORD = "TestPass123!";

// Helper: log in as Ada and return the authenticated page
async function loginAsAda(page: import("@playwright/test").Page) {
  await page.goto("/sign-in");
  await page.getByLabel(/email/i).fill(ADA_EMAIL);
  await page.getByLabel(/password/i).fill(ADA_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/(student\/dashboard)?|\/$/, { timeout: 15000 });
}

test.describe("Phase 2C: Student page renders", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAda(page);
  });

  test("/student/dashboard renders without crash", async ({ page }) => {
    await page.goto("/student/dashboard");
    await page.waitForLoadState("networkidle", { timeout: 15000 });
    // Should show Ada's greeting or dashboard content
    await expect(page.locator("body")).not.toContainText("Application error");
    await expect(page.locator("body")).not.toContainText("Internal Server Error");
  });

  test("/student/courses renders course list", async ({ page }) => {
    await page.goto("/student/courses");
    await page.waitForLoadState("networkidle", { timeout: 15000 });
    await expect(page.locator("body")).not.toContainText("Application error");
    // Ada should see at least one course code
    const hasCourse = await page.getByText(/COS\d{3}|MTH\d{3}|GST\d{3}/).first()
      .isVisible({ timeout: 10000 })
      .catch(() => false);
    expect(hasCourse).toBe(true);
  });

  test("/student/grades renders", async ({ page }) => {
    await page.goto("/student/grades");
    await page.waitForLoadState("networkidle", { timeout: 15000 });
    await expect(page.locator("body")).not.toContainText("Application error");
  });

  test("/student/materials renders", async ({ page }) => {
    await page.goto("/student/materials");
    await page.waitForLoadState("networkidle", { timeout: 15000 });
    await expect(page.locator("body")).not.toContainText("Application error");
  });
});

test.describe("Phase 2C: Admin page renders", () => {
  // Admin credentials — read from env or use known seed
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@miva.edu.ng";
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "TestPass123!";

  test.beforeEach(async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
    await page.getByLabel(/password/i).fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/(admin)?|\/$/, { timeout: 15000 });
  });

  test("/admin/users renders with isVerified badges", async ({ page }) => {
    await page.goto("/admin/users");
    await page.waitForLoadState("networkidle", { timeout: 15000 });
    await expect(page.locator("body")).not.toContainText("Application error");
    // Should show the user management table
    await expect(page.getByText(/user management/i)).toBeVisible({ timeout: 10000 });
    // isVerified badges should be present (Verified or Unverified)
    const hasBadge = await page.getByText(/verified|unverified/i).first()
      .isVisible({ timeout: 10000 })
      .catch(() => false);
    expect(hasBadge).toBe(true);
  });
});
