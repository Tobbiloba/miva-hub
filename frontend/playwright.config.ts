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
    baseURL: process.env.TEST_BASE_URL || "http://localhost:4002",
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
    command: "pnpm dev --port 4002",
    url: "http://localhost:4002",
    reuseExistingServer: true,
    timeout: 60_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
