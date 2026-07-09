import { expect, test } from "@playwright/test";

test("smoke: sign-in page renders", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page).toHaveTitle(/askly/i);
  await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
});
