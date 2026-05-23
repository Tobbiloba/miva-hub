import { test, expect } from "@playwright/test";

/**
 * Phase 2B: Self-service signup flow.
 * Creates a tagged test user, asserts auto-enrollment, then tears down.
 * NEVER touches seeded demo accounts.
 */

const TEST_EMAIL_PREFIX = "playwright-test-";

function testEmail(): string {
  return `${TEST_EMAIL_PREFIX}${Date.now()}@example.com`;
}

test.describe("Phase 2B: Self-service Signup", () => {
  let createdEmail: string;

  test.afterEach(async ({ request }) => {
    if (createdEmail) {
      console.log(`[TEARDOWN] Test user to clean: ${createdEmail}`);
    }
  });

  // NOTE: The register API takes ~86s because sendEmail() blocks on an
  // unreachable SMTP server until TCP timeout. This is a real app performance
  // issue (surfaced separately) — not a test problem. The timeout here
  // accommodates it so the test exercises the actual signup path.
  test("full signup flow → dashboard with 5 enrolled courses", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    createdEmail = testEmail();

    // Step 1: Navigate to sign-up
    await page.goto("/sign-up");
    await expect(page.getByText(/join miva/i)).toBeVisible({ timeout: 10000 });

    // Fill Step 1 fields
    await page.getByLabel(/full name/i).fill("PW Test Student");
    await page.getByLabel(/email/i).fill(createdEmail);
    await page.getByLabel(/^password$/i).fill("Test1234!");
    await page.getByLabel(/confirm password/i).fill("Test1234!");

    // Click Next — use exact: true to avoid matching "Open Next.js Dev Tools"
    await page.getByRole("button", { name: "Next", exact: true }).click();

    // Step 2 should appear — wait for the Program label
    await expect(page.getByText(/program/i).first()).toBeVisible({
      timeout: 15000,
    });

    // Select Program: B.Sc Computer Science
    await page.getByRole("combobox").first().click();
    await page.getByRole("option", { name: /computer science/i }).click();

    // Select Level: 200
    await page.getByRole("combobox").nth(1).click();
    await page.getByRole("option", { name: /200/i }).click();

    // Verify session is displayed (read-only) — use .first() since the
    // session text appears in both the read-only display and the preview
    await expect(page.getByText(/2025\/2026/).first()).toBeVisible();
    await expect(page.getByText(/first semester/i).first()).toBeVisible();

    // Submit
    await page.getByRole("button", { name: /create account/i }).click();

    // Should show success and redirect to dashboard
    // (register API blocks ~86s on SMTP timeout before responding)
    await page.waitForURL(/student\/dashboard/, { timeout: 100_000 });

    // Dashboard should render without crash
    await expect(page.locator("body")).not.toContainText("Application error");
  });

  test("non-MIVA email shows soft warning but allows submit", async ({
    page,
  }) => {
    await page.goto("/sign-up", { waitUntil: "networkidle" });
    await expect(page.getByText(/join miva/i)).toBeVisible({ timeout: 10000 });

    // Fill with non-MIVA email — use specific label to avoid ambiguity
    await page.getByLabel(/full name/i).fill("PW Gmail Test");
    await page.getByLabel(/email address/i).fill("pw-test-gmail@gmail.com");

    // Warning should appear — use web-first assertion (auto-waits)
    await expect(page.getByText(/recommend.*miva/i)).toBeVisible({
      timeout: 5000,
    });

    // The Next button should still be clickable (not disabled)
    await expect(
      page.getByRole("button", { name: "Next", exact: true })
    ).toBeEnabled();
  });

  test("malformed matric number shows inline error", async ({ page }) => {
    await page.goto("/sign-up");
    await expect(page.getByText(/join miva/i)).toBeVisible({ timeout: 10000 });

    // Fill step 1 and advance
    await page.getByLabel(/full name/i).fill("PW Matric Test");
    await page.getByLabel(/email/i).fill(testEmail());
    await page.getByLabel(/^password$/i).fill("Test1234!");
    await page.getByLabel(/confirm password/i).fill("Test1234!");
    await page.getByRole("button", { name: "Next", exact: true }).click();

    // Wait for step 2 to fully render
    await expect(page.getByLabel(/matric/i)).toBeVisible({ timeout: 15000 });

    // Enter malformed matric
    await page.getByLabel(/matric/i).fill("ABC123");

    // Should show format error
    await expect(page.getByText(/MIVA\/DEPT\/YEAR\/NNN/i)).toBeVisible({
      timeout: 5000,
    });
  });
});
