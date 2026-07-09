import { Page, expect, test } from "@playwright/test";

/**
 * Phase 2C: Navigation renders — visit key pages, assert no crash + key element.
 * Read-only against Ada's data — never writes.
 *
 * Uses browser-side fetch for login to set session cookie in browser jar.
 */

const ADA_EMAIL = "ada.okonkwo@miva.edu.ng";
const ADA_PASSWORD = "TestPass123!";

async function browserSignIn(page: Page, email: string, password: string) {
  await page.goto("/sign-in");
  await page.evaluate(
    async ({ email, password }) => {
      await fetch("/api/auth/sign-in/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });
    },
    { email, password },
  );
}

test.describe("Phase 2C: Student page renders", () => {
  test.beforeEach(async ({ page }) => {
    await browserSignIn(page, ADA_EMAIL, ADA_PASSWORD);
  });

  test("/student/dashboard renders without crash", async ({ page }) => {
    await page.goto("/student/dashboard");
    await page.waitForLoadState("networkidle", { timeout: 15000 });
    await expect(page.locator("body")).not.toContainText("Application error");
    await expect(page.locator("body")).not.toContainText(
      "Internal Server Error",
    );
  });

  test("/student/courses renders course list", async ({ page }) => {
    await page.goto("/student/courses");
    await page.waitForLoadState("networkidle", { timeout: 15000 });
    await expect(page.locator("body")).not.toContainText("Application error");
    await expect(
      page.locator("text=/COS|MTH|GST|course/i").first(),
    ).toBeVisible({ timeout: 10000 });
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
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "oluwatobi.salau@miva.edu.ng";
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

  test("/admin/users renders with isVerified badges", async ({ page }) => {
    if (!ADMIN_PASSWORD) {
      test.skip(
        true,
        "ADMIN_PASSWORD env var not set — admin password unknown for seeded admin",
      );
      return;
    }

    await browserSignIn(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto("/admin/users");
    await page.waitForLoadState("networkidle", { timeout: 15000 });
    await expect(page.locator("body")).not.toContainText("Application error");
    await expect(page.getByText(/user management/i)).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.locator("text=/verified|unverified/i").first(),
    ).toBeVisible({ timeout: 10000 });
  });
});
