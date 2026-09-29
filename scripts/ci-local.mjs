// Local CI: same steps as .github/workflows/ci.yml (GitHub Actions is unavailable on this account).
// Usage: pnpm ci:local           full pipeline
//        pnpm ci:local --quick   skip build and E2E
import { spawnSync } from "node:child_process";

const quick = process.argv.includes("--quick");

const steps = [
  ["Format", "pnpm format:check"],
  ["Typecheck", "pnpm typecheck"],
  ["Lint", "pnpm lint"],
  ["Tests unitaires", "pnpm test"],
  ...(quick
    ? []
    : [
        ["Build", "pnpm build"],
        ["Tests E2E", "pnpm test:e2e"],
      ]),
];

const started = Date.now();

for (const [name, command] of steps) {
  const stepStart = Date.now();
  process.stdout.write(`\n▶ ${name}\n`);
  const result = spawnSync(command, {
    shell: true,
    stdio: "inherit",
    // CI=1 makes Playwright serve the production build and forbid test.only.
    env: { ...process.env, CI: "1" },
  });
  const seconds = ((Date.now() - stepStart) / 1000).toFixed(1);
  if (result.status !== 0) {
    console.error(`\n✗ ${name} a échoué (${seconds}s)`);
    process.exit(result.status ?? 1);
  }
  console.log(`✓ ${name} (${seconds}s)`);
}

const total = ((Date.now() - started) / 1000).toFixed(1);
console.log(`\n✓ CI locale réussie en ${total}s`);
