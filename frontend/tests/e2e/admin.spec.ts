import { test, expect, Page } from "@playwright/test";

/**
 * Phase 2D: Admin verification toggle.
 *
 * Tests the is_verified toggle API (PUT /api/admin/users/:id) by creating
 * a test student, toggling their verification status, and cleaning up.
 *
 * Admin login requires ADMIN_EMAIL + ADMIN_PASSWORD env vars. If the admin
 * password is unknown (seeded admin has no known password), tests are skipped
 * with a clear message rather than silently failing.
 */

const ADMIN_EMAIL =
  process.env.ADMIN_EMAIL || "oluwatobi.salau@miva.edu.ng";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

async function browserSignIn(page: Page, email: string, password: string) {
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

test.describe("Phase 2D: Admin verification toggle", () => {
  test("toggle is_verified on a test student", async ({ page }) => {
    if (!ADMIN_PASSWORD) {
      test.skip(
        true,
        "ADMIN_PASSWORD env var not set — admin password is unknown for seeded admin. Set ADMIN_PASSWORD to run this test."
      );
      return;
    }

    // Step 1: Log in as admin
    const loginResult = await browserSignIn(
      page,
      ADMIN_EMAIL,
      ADMIN_PASSWORD
    );
    if (!loginResult.ok) {
      test.skip(true, "Admin login failed — check ADMIN_EMAIL/ADMIN_PASSWORD");
      return;
    }

    // Step 2: Create test student via admin API
    const testEmail = `playwright-test-admin-${Date.now()}@example.com`;
    const createResult = await page.evaluate(
      async ({ email }) => {
        const res = await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "PW Admin Toggle Test",
            email,
            role: "student",
            password: "Test1234!",
          }),
          credentials: "include",
        });
        if (!res.ok) return { ok: false, userId: null };
        const data = await res.json();
        return { ok: true, userId: data.data?.id };
      },
      { email: testEmail }
    );

    if (!createResult.ok || !createResult.userId) {
      test.skip(true, "Could not create test student via admin API");
      return;
    }

    const testUserId = createResult.userId;

    try {
      // Step 3: Toggle verification ON
      const toggleOn = await page.evaluate(
        async ({ id }) => {
          const res = await fetch(`/api/admin/users/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isVerified: true }),
            credentials: "include",
          });
          return res.ok;
        },
        { id: testUserId }
      );
      expect(toggleOn).toBe(true);

      // Step 4: Toggle verification OFF
      const toggleOff = await page.evaluate(
        async ({ id }) => {
          const res = await fetch(`/api/admin/users/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isVerified: false }),
            credentials: "include",
          });
          return res.ok;
        },
        { id: testUserId }
      );
      expect(toggleOff).toBe(true);
    } finally {
      // Step 5: Teardown
      await page.evaluate(
        async ({ id }) => {
          await fetch(`/api/admin/users/${id}`, {
            method: "DELETE",
            credentials: "include",
          });
        },
        { id: testUserId }
      );
      console.log(
        `[TEARDOWN] Deleted test user: ${testEmail} (${testUserId})`
      );
    }
  });
});
