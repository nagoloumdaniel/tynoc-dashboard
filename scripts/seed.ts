import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { createDocumentClient } from "../src/lib/aws/dynamodb";
import { tableName } from "../src/lib/aws/tables";
import { getServerEnv } from "../src/lib/env";

// Minimal seed for Phase 1: the global stats item read by the dashboard.
// Entity fixtures (products, users…) are added with their modules.
async function main() {
  const env = getServerEnv();
  if (!env.DYNAMODB_ENDPOINT) {
    throw new Error(
      "DYNAMODB_ENDPOINT manquant : ce script ne cible que DynamoDB Local.",
    );
  }

  const doc = createDocumentClient({
    region: env.AWS_REGION,
    endpoint: env.DYNAMODB_ENDPOINT,
  });
  const now = new Date().toISOString();

  await doc.send(
    new PutCommand({
      TableName: tableName("Stats", env.DYNAMODB_TABLE_PREFIX),
      Item: {
        pk: "GLOBAL",
        totalUsers: 0,
        totalProducts: 0,
        totalCategories: 0,
        cartItems: 0,
        wishlistItems: 0,
        outOfStock: 0,
        lowStock: 0,
        updatedAt: now,
      },
    }),
  );
  console.log("+ Stats#GLOBAL");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
