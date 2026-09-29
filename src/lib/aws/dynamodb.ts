import "server-only";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { getServerEnv } from "@/lib/env";
import { createDynamoClient, type DynamoClientOptions } from "./client";
import { type TableKey, tableName } from "./tables";

// Survives hot reloads in dev so we don't open a new client per edit.
const globalForDb = globalThis as unknown as {
  dynamoDoc?: DynamoDBDocumentClient;
};

export function createDocumentClient(
  options: DynamoClientOptions,
): DynamoDBDocumentClient {
  return DynamoDBDocumentClient.from(createDynamoClient(options), {
    marshallOptions: { removeUndefinedValues: true },
  });
}

export function db(): DynamoDBDocumentClient {
  if (!globalForDb.dynamoDoc) {
    const env = getServerEnv();
    globalForDb.dynamoDoc = createDocumentClient({
      region: env.AWS_REGION,
      endpoint: env.DYNAMODB_ENDPOINT,
      roleArn: env.AWS_ROLE_ARN,
    });
  }
  return globalForDb.dynamoDoc;
}

export function table(key: TableKey): string {
  return tableName(key, getServerEnv().DYNAMODB_TABLE_PREFIX);
}
