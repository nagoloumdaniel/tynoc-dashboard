// Local CI: same steps as .github/workflows/ci.yml (GitHub Actions is unavailable on this account).
// Usage: pnpm ci:local           full pipeline
//        pnpm ci:local --quick   skip build and E2E
import { spawnSync } from "node:child_process";

const quick = process.argv.includes("--quick");
const DYNAMODB_URL = "http://localhost:8000";

async function dynamoIsUp() {
  try {
    await fetch(DYNAMODB_URL);
    return true;
  } catch {
    return false;
  }
}

// Integration and E2E tests need DynamoDB Local; start it when it is down.
async function ensureDynamoDb() {
  if (await dynamoIsUp()) return 0;
  const started = spawnSync("docker compose up -d dynamodb", {
    shell: true,
    stdio: "inherit",
  });
  if (started.status !== 0) {
    console.error("Docker est-il lancé ? DynamoDB Local n'a pas pu démarrer.");
    return 1;
  }
  for (let i = 0; i < 30; i++) {
    if (await dynamoIsUp()) return 0;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  console.error(`DynamoDB Local ne répond pas sur ${DYNAMODB_URL}.`);
  return 1;
}

const steps = [
  ["Format", "pnpm format:check"],
  ["Typecheck", "pnpm typecheck"],
  ["Lint", "pnpm lint"],
  ["DynamoDB Local", ensureDynamoDb],
  ["Base de test", "pnpm db:test:reset"],
  ["Tests unitaires et intégration", "pnpm test"],
  ...(quick
    ? []
    : [
        ["Build", "pnpm build"],
        ["Tests E2E", "pnpm test:e2e"],
      ]),
];

const started = Date.now();

for (const [name, step] of steps) {
  const stepStart = Date.now();
  process.stdout.write(`\n▶ ${name}\n`);
  const status =
    typeof step === "function"
      ? await step()
      : spawnSync(step, {
          shell: true,
          stdio: "inherit",
          // CI=1 makes Playwright serve the production build and forbid test.only.
          env: { ...process.env, CI: "1" },
        }).status;
  const seconds = ((Date.now() - stepStart) / 1000).toFixed(1);
  if (status !== 0) {
    console.error(`\n✗ ${name} a échoué (${seconds}s)`);
    process.exit(status ?? 1);
  }
  console.log(`✓ ${name} (${seconds}s)`);
}

const total = ((Date.now() - started) / 1000).toFixed(1);
console.log(`\n✓ CI locale réussie en ${total}s`);
