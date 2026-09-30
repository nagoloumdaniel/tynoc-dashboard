import { defineConfig, devices } from "@playwright/test";
import { AUTH_STATE } from "./tests/e2e/test-users";

const PORT = 3100;
// Set to run the suite against a deployment (e.g. https://tynoc-dashboard.vercel.app).
const REMOTE_URL = process.env.E2E_BASE_URL;

// The local server under test reads the disposable test tables.
const TEST_DB_ENV = {
  AWS_REGION: "eu-west-3",
  DYNAMODB_ENDPOINT: "http://localhost:8000",
  DYNAMODB_TABLE_PREFIX: "tynoc-test-",
  S3_ENDPOINT: "http://localhost:9000",
  S3_BUCKET: "tynoc-test-images",
};

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // The local CI runs every worker, DynamoDB Local, S3 and scrypt on one
  // machine: server round-trips can exceed the default 5 s under load.
  expect: { timeout: process.env.CI ? 10_000 : 5_000 },
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  globalSetup: REMOTE_URL ? undefined : "./tests/e2e/global-setup.ts",
  use: {
    baseURL: REMOTE_URL ?? `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        storageState: AUTH_STATE.superAdmin,
      },
      dependencies: ["setup"],
    },
    {
      name: "mobile",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 375, height: 740 },
        hasTouch: true,
        storageState: AUTH_STATE.superAdmin,
      },
      dependencies: ["setup"],
      // Login and account flows do not depend on the viewport, and account
      // changes on shared targets (carts, an admin's read position) must not
      // run twice in parallel.
      testIgnore: /(auth|users|carts|notifications)\.spec\.ts/,
    },
  ],
  webServer: REMOTE_URL
    ? undefined
    : {
        // CI builds first, then serves the production bundle.
        command: process.env.CI
          ? `pnpm start -p ${PORT}`
          : `pnpm dev -p ${PORT}`,
        url: `http://localhost:${PORT}/login`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: TEST_DB_ENV,
      },
});
