// Local CI: same steps as .github/workflows/ci.yml (GitHub Actions is unavailable on this account).
// Usage: pnpm ci:local           full pipeline
//        pnpm ci:local --quick   skip build and E2E
import { spawnSync } from "node:child_process";

const quick = process.argv.includes("--quick");
const SERVICES = {
  dynamodb: "http://localhost:8000",
  s3: "http://localhost:9000",
};

async function isUp(url) {
  try {
    await fetch(url);
    return true;
  } catch {
    return false;
  }
}

// Integration and E2E tests need DynamoDB Local and the S3 container; start
// them when they are down.
async function ensureServices() {
  const down = [];
  for (const [name, url] of Object.entries(SERVICES)) {
    if (!(await isUp(url))) down.push(name);
  }
  if (down.length === 0) return 0;
  const started = spawnSync(`docker compose up -d ${down.join(" ")}`, {
    shell: true,
    stdio: "inherit",
  });
  if (started.status !== 0) {
    console.error(
      "Docker est-il lancé ? Les services locaux n'ont pas pu démarrer.",
    );
    return 1;
  }
  for (const name of down) {
    let up = false;
    for (let i = 0; i < 30 && !up; i++) {
      up = await isUp(SERVICES[name]);
      if (!up) await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    if (!up) {
      console.error(`${name} ne répond pas sur ${SERVICES[name]}.`);
      return 1;
    }
  }
  return 0;
}

const steps = [
  ["Format", "pnpm format:check"],
  ["Typecheck", "pnpm typecheck"],
  ["Lint", "pnpm lint"],
  ["DynamoDB Local et S3", ensureServices],
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
