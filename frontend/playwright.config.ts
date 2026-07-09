import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

if (process.env.CI) {
  config({ path: ".env.test" });
} else {
  config();
}

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: "list",
  use: {
    // Must match BETTER_AUTH_URL/NEXT_PUBLIC_APP_URL (port 4001) — better-auth
    // rejects sign-in requests from other origins.
    baseURL: process.env.TEST_BASE_URL || "http://localhost:4001",
    ignoreHTTPSErrors: true,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
  ],

  webServer: {
    command: "pnpm dev --port 4001",
    url: "http://localhost:4001",
    reuseExistingServer: true,
    timeout: 60_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
