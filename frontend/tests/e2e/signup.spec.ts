import { Page, expect, test } from "@playwright/test";

/**
 * Phase 2B: Self-service signup flow (multi-tenant Askly).
 * Signup is hard-gated to email domains registered to an active university
 * (miva.edu.ng in seed data). Creates a tagged test user, then logs it for
 * cleanup. NEVER touches seeded demo accounts.
 */

const TEST_EMAIL_PREFIX = "playwright-test-";

function testEmail(): string {
  // Must be on a registered university domain — signup is domain-gated.
  return `${TEST_EMAIL_PREFIX}${Date.now()}@miva.edu.ng`;
}

/** Fill step 1 and wait for the university to resolve from the email domain. */
async function fillStep1(page: Page, name: string, email: string) {
  await page.getByLabel(/full name/i).fill(name);
  await page.getByLabel(/email address/i).fill(email);
  // University resolution is debounced (500ms) — wait for the confirmation
  await expect(page.getByText(/signing up for/i)).toBeVisible({
    timeout: 10000,
  });
  await page.getByLabel(/^password$/i).fill("Test1234!");
  await page.getByLabel(/confirm password/i).fill("Test1234!");
}

test.describe("Phase 2B: Self-service Signup", () => {
  let createdEmail: string;

  test.afterEach(async () => {
    if (createdEmail) {
      console.log(`[TEARDOWN] Test user to clean: ${createdEmail}`);
    }
  });

  // NOTE: The register API can block on sendEmail() if SMTP is unreachable.
  // The generous timeout accommodates that so the test exercises the real path.
  test("full signup flow → account created, redirected to sign-in", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    createdEmail = testEmail();

    // Step 1: Navigate to sign-up
    await page.goto("/sign-up");
    await expect(page.getByText(/create your account/i)).toBeVisible({
      timeout: 10000,
    });

    await fillStep1(page, "PW Test Student", createdEmail);

    // Once the domain resolves, the header shows the university name
    await expect(page.getByText(/join miva/i)).toBeVisible();

    // Click Next — use exact: true to avoid matching "Open Next.js Dev Tools"
    await page.getByRole("button", { name: "Next", exact: true }).click();

    // Step 2 should appear — wait for the Program label
    await expect(page.getByText(/program/i).first()).toBeVisible({
      timeout: 15000,
    });

    // Select Program: Computer Science
    await page.getByRole("combobox").first().click();
    await page.getByRole("option", { name: /computer science/i }).click();

    // Select Level: 200
    await page.getByRole("combobox").nth(1).click();
    await page.getByRole("option", { name: /200/i }).click();

    // Verify session is displayed (read-only) — use .first() since the
    // session text appears in both the read-only display and the preview
    await expect(page.getByText(/2025\/2026/).first()).toBeVisible();
    await expect(page.getByText(/first semester/i).first()).toBeVisible();

    // Accept Terms of Service (required)
    await page.getByRole("checkbox").check();

    // Submit
    await page.getByRole("button", { name: /create account/i }).click();

    // Success → toast + redirect to sign-in (email verification required
    // before first login; register API may block on SMTP before responding)
    await page.waitForURL(/sign-in/, { timeout: 100_000 });
  });

  test("unregistered email domain shows warning and blocks advancing", async ({
    page,
  }) => {
    await page.goto("/sign-up", { waitUntil: "networkidle" });
    await expect(page.getByText(/create your account/i)).toBeVisible({
      timeout: 10000,
    });

    // Fill with an email on an unregistered domain
    await page.getByLabel(/full name/i).fill("PW Gmail Test");
    await page.getByLabel(/email address/i).fill("pw-test-gmail@gmail.com");

    // Hard-gate warning should appear (auto-waits through the 500ms debounce)
    await expect(
      page.getByText(/isn't registered with any university/i),
    ).toBeVisible({ timeout: 10000 });

    await page.getByLabel(/^password$/i).fill("Test1234!");
    await page.getByLabel(/confirm password/i).fill("Test1234!");

    // Clicking Next must NOT advance to step 2 — signup is domain-gated
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(page.getByText(/step 1 of 2/i)).toBeVisible();
    await expect(page.getByLabel(/full name/i)).toBeVisible();
  });

  test("malformed matric number shows inline error", async ({ page }) => {
    await page.goto("/sign-up");
    await expect(page.getByText(/create your account/i)).toBeVisible({
      timeout: 10000,
    });

    // Fill step 1 with a registered-domain email and advance
    await fillStep1(page, "PW Matric Test", testEmail());
    await page.getByRole("button", { name: "Next", exact: true }).click();

    // Wait for step 2 to fully render
    await expect(page.getByLabel(/matric/i)).toBeVisible({ timeout: 15000 });

    // Enter a malformed matric — validation is loose (formats vary per
    // university) but disallows spaces/special characters
    await page.getByLabel(/matric/i).fill("AB C@123!");

    // Should show format error
    await expect(page.getByText(/letters, numbers/i)).toBeVisible({
      timeout: 5000,
    });
  });
});
