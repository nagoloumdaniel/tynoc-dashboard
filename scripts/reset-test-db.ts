import { createDynamoClient } from "../src/lib/aws/client";
import { run } from "./lib/cli";
import { dropTables, ensureTables } from "./lib/ensure-tables";

export const TEST_ENDPOINT = "http://localhost:8000";
export const TEST_PREFIX = "tynoc-test-";

// Recreates the test tables from scratch so every E2E run starts clean
// (sessions, rate-limit counters and users included).
run(async () => {
  process.env.DYNAMODB_ENDPOINT = TEST_ENDPOINT;
  process.env.DYNAMODB_TABLE_PREFIX = TEST_PREFIX;

  const client = createDynamoClient({
    region: "eu-west-3",
    endpoint: TEST_ENDPOINT,
  });
  await dropTables(client, TEST_PREFIX);
  await ensureTables(client, TEST_PREFIX, () => {});
  console.log(`Base de test réinitialisée (${TEST_PREFIX}*)`);
});
