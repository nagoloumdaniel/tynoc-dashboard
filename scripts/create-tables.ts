import {
  CreateTableCommand,
  DynamoDBClient,
  ListTablesCommand,
} from "@aws-sdk/client-dynamodb";
import { TABLES, type TableKey, tableName } from "../src/lib/aws/tables";
import { getServerEnv } from "../src/lib/env";

async function main() {
  const env = getServerEnv();
  if (!env.DYNAMODB_ENDPOINT) {
    throw new Error(
      "DYNAMODB_ENDPOINT manquant : ce script ne cible que DynamoDB Local.",
    );
  }

  const client = new DynamoDBClient({
    region: env.AWS_REGION,
    endpoint: env.DYNAMODB_ENDPOINT,
    credentials: { accessKeyId: "local", secretAccessKey: "local" },
  });

  const existing = new Set(
    (await client.send(new ListTablesCommand({}))).TableNames ?? [],
  );

  for (const key of Object.keys(TABLES) as TableKey[]) {
    const name = tableName(key, env.DYNAMODB_TABLE_PREFIX);
    if (existing.has(name)) {
      console.log(`= ${name} (existe déjà)`);
      continue;
    }
    await client.send(
      new CreateTableCommand({
        ...TABLES[key],
        TableName: name,
        BillingMode: "PAY_PER_REQUEST",
      }),
    );
    console.log(`+ ${name}`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
