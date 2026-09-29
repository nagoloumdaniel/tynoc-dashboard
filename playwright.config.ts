import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
// Set to run the suite against a deployment (e.g. https://tynoc-dashboard.vercel.app).
const REMOTE_URL = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: REMOTE_URL ?? `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 375, height: 740 },
        hasTouch: true,
      },
    },
  ],
  webServer: REMOTE_URL
    ? undefined
    : {
        // CI builds first, then serves the production bundle.
        command: process.env.CI
          ? `pnpm start -p ${PORT}`
          : `pnpm dev -p ${PORT}`,
        url: `http://localhost:${PORT}/admin`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
