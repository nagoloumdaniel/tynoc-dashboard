import { TEST_USERS } from "../tests/e2e/test-users";
import { createUser } from "../src/features/users/repository";
import { createDynamoClient } from "../src/lib/aws/client";
import { hashPassword } from "../src/lib/auth/password";
import { run } from "./lib/cli";
import { dropTables, ensureTables } from "./lib/ensure-tables";

const TEST_ENDPOINT = "http://localhost:8000";
const TEST_PREFIX = "tynoc-test-";

// Recreates the test tables from scratch so every E2E run starts clean
// (sessions, rate-limit counters and users included), then adds test accounts.
run(async () => {
  process.env.DYNAMODB_ENDPOINT = TEST_ENDPOINT;
  process.env.DYNAMODB_TABLE_PREFIX = TEST_PREFIX;

  const client = createDynamoClient({
    region: "eu-west-3",
    endpoint: TEST_ENDPOINT,
  });
  await dropTables(client, TEST_PREFIX);
  await ensureTables(client, TEST_PREFIX, () => {});

  for (const user of Object.values(TEST_USERS)) {
    await createUser({
      name: user.name,
      email: user.email,
      role: user.role,
      passwordHash: await hashPassword(user.password),
    });
  }
  console.log(
    `Base de test réinitialisée (${TEST_PREFIX}*, ${Object.keys(TEST_USERS).length} comptes)`,
  );
});
