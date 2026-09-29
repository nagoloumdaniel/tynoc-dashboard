import "server-only";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { getServerEnv } from "@/lib/env";
import { type TableKey, tableName } from "./tables";

// Survives hot reloads in dev so we don't open a new client per edit.
const globalForDb = globalThis as unknown as {
  dynamoDoc?: DynamoDBDocumentClient;
};

export function createDocumentClient(options: {
  region: string;
  endpoint?: string;
}): DynamoDBDocumentClient {
  const client = new DynamoDBClient({
    region: options.region,
    endpoint: options.endpoint,
    // DynamoDB Local accepts any credentials; real AWS uses the default provider chain (OIDC role in prod).
    ...(options.endpoint && {
      credentials: { accessKeyId: "local", secretAccessKey: "local" },
    }),
  });
  return DynamoDBDocumentClient.from(client, {
    marshallOptions: { removeUndefinedValues: true },
  });
}

export function db(): DynamoDBDocumentClient {
  if (!globalForDb.dynamoDoc) {
    const env = getServerEnv();
    globalForDb.dynamoDoc = createDocumentClient({
      region: env.AWS_REGION,
      endpoint: env.DYNAMODB_ENDPOINT,
    });
  }
  return globalForDb.dynamoDoc;
}

export function table(key: TableKey): string {
  return tableName(key, getServerEnv().DYNAMODB_TABLE_PREFIX);
}
