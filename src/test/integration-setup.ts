import { createDynamoClient } from "../lib/aws/client";
import { ensureTables } from "../../scripts/lib/ensure-tables";

const ENDPOINT = "http://localhost:8000";

// Runs once before the integration project: the tables must exist on DynamoDB Local.
export default async function setup() {
  try {
    await fetch(ENDPOINT);
  } catch {
    throw new Error(
      `DynamoDB Local ne répond pas sur ${ENDPOINT}. Lancez « pnpm db:up » (Docker) puis relancez les tests.`,
    );
  }
  const client = createDynamoClient({
    region: "eu-west-3",
    endpoint: ENDPOINT,
  });
  await ensureTables(client, "tynoc-test-", () => {});
}
