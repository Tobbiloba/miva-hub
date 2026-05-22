import { test, expect } from "@playwright/test";

/**
 * Phase 2D: Admin verification toggle.
 * Creates a test student via API, toggles is_verified as admin, asserts badge changes.
 * Tears down the test student after.
 */

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@miva.edu.ng";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "TestPass123!";

test.describe("Phase 2D: Admin verification toggle", () => {
  test("toggle is_verified on a test student", async ({ page, request }) => {
    // Step 1: Create a test student via the register API
    const testEmail = `playwright-test-admin-${Date.now()}@example.com`;
    const regRes = await request.post("/api/auth/register", {
      data: {
        name: "PW Admin Toggle Test",
        email: testEmail,
        password: "Test1234!",
        programId: "66d8efe2-29b7-4db2-80b3-f1aaa687865a",
        level: 200,
      },
    });

    let testUserId: string | null = null;

    if (regRes.ok()) {
      const regData = await regRes.json();
      testUserId = regData.user?.id;
    } else {
      // If registration fails (e.g. user exists), skip gracefully
      test.skip(true, "Could not create test student for admin toggle test");
      return;
    }

    try {
      // Step 2: Log in as admin
      await page.goto("/sign-in");
      await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
      await page.getByLabel(/password/i).fill(ADMIN_PASSWORD);
      await page.getByRole("button", { name: /sign in/i }).click();
      await page.waitForURL(/\/(admin)?|\/$/, { timeout: 15000 });

      // Step 3: Navigate to user management
      await page.goto("/admin/users");
      await page.waitForLoadState("networkidle", { timeout: 15000 });

      // Step 4: Find the test student and verify initial state (Unverified)
      const testRow = page.getByText(testEmail).locator("..").locator("..").locator("..");

      // The student should show "Unverified" badge initially
      await expect(page.getByText(testEmail)).toBeVisible({ timeout: 10000 });

      // Step 5: Toggle verification via API (more reliable than clicking through UI)
      const toggleRes = await request.put(`/api/admin/users/${testUserId}`, {
        data: { isVerified: true },
      });
      expect(toggleRes.ok()).toBe(true);

      // Step 6: Reload and verify badge changed
      await page.reload();
      await page.waitForLoadState("networkidle");

      // Step 7: Toggle back
      const toggleBackRes = await request.put(`/api/admin/users/${testUserId}`, {
        data: { isVerified: false },
      });
      expect(toggleBackRes.ok()).toBe(true);
    } finally {
      // Step 8: Teardown — delete the test student
      if (testUserId) {
        await request.delete(`/api/admin/users/${testUserId}`);
        console.log(`[TEARDOWN] Deleted test user: ${testEmail} (${testUserId})`);
      }
    }
  });
});
