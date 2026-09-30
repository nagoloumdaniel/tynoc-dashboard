import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    // server-only throws outside a React Server environment
    alias: {
      "server-only": fileURLToPath(
        new URL("./src/test/empty.ts", import.meta.url),
      ),
    },
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "jsdom",
          setupFiles: ["./vitest.setup.ts"],
          include: ["src/**/*.test.{ts,tsx}"],
          exclude: ["**/node_modules/**", "src/**/*.int.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          environment: "node",
          include: ["src/**/*.int.test.ts"],
          globalSetup: ["./src/test/integration-setup.ts"],
          // Files share the global Stats counters: run them one at a time.
          fileParallelism: false,
          env: {
            AWS_REGION: "eu-west-3",
            DYNAMODB_ENDPOINT: "http://localhost:8000",
            DYNAMODB_TABLE_PREFIX: "tynoc-test-",
            CRON_SECRET: "test-cron-secret-0123456789",
          },
        },
      },
    ],
  },
});
