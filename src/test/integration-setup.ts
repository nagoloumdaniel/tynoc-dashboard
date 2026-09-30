import { createDynamoClient, createS3Client } from "../lib/aws/client";
import { ensureBucket } from "../../scripts/lib/ensure-bucket";
import { ensureTables } from "../../scripts/lib/ensure-tables";

const ENDPOINT = "http://localhost:8000";
const S3_ENDPOINT = "http://localhost:9000";

async function reachable(url: string, service: string) {
  try {
    await fetch(url);
  } catch {
    throw new Error(
      `${service} ne répond pas sur ${url}. Lancez « pnpm db:up » (Docker) puis relancez les tests.`,
    );
  }
}

// Runs once before the integration project: the tables and the images bucket
// must exist on the local services.
export default async function setup() {
  await reachable(ENDPOINT, "DynamoDB Local");
  await reachable(S3_ENDPOINT, "Le stockage S3 local");
  const client = createDynamoClient({
    region: "eu-west-3",
    endpoint: ENDPOINT,
  });
  await ensureTables(client, "tynoc-test-", () => {});
  await ensureBucket(
    createS3Client({ region: "eu-west-3", endpoint: S3_ENDPOINT }),
    "tynoc-test-images",
    { region: "eu-west-3", aws: false, origins: ["*"] },
    () => {},
  );
}
