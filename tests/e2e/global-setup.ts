import { execSync } from "node:child_process";

// Fresh test tables and accounts before every local run.
export default function globalSetup() {
  execSync("pnpm db:test:reset", { stdio: "inherit" });
}
