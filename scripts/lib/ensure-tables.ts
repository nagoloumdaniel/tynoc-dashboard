import {
  CreateTableCommand,
  DeleteTableCommand,
  DescribeTimeToLiveCommand,
  type DynamoDBClient,
  ListTablesCommand,
  UpdateTimeToLiveCommand,
  waitUntilTableExists,
  waitUntilTableNotExists,
} from "@aws-sdk/client-dynamodb";
import {
  TABLES,
  type TableKey,
  TTL_ATTRIBUTES,
  tableName,
} from "../../src/lib/aws/tables";

async function listTableNames(client: DynamoDBClient): Promise<Set<string>> {
  const names = new Set<string>();
  let start: string | undefined;
  do {
    const page = await client.send(
      new ListTablesCommand({ ExclusiveStartTableName: start }),
    );
    for (const name of page.TableNames ?? []) names.add(name);
    start = page.LastEvaluatedTableName;
  } while (start);
  return names;
}

async function ensureTtl(client: DynamoDBClient, name: string, attr: string) {
  const current = await client.send(
    new DescribeTimeToLiveCommand({ TableName: name }),
  );
  const status = current.TimeToLiveDescription?.TimeToLiveStatus;
  if (status === "ENABLED" || status === "ENABLING") return false;
  await client.send(
    new UpdateTimeToLiveCommand({
      TableName: name,
      TimeToLiveSpecification: { AttributeName: attr, Enabled: true },
    }),
  );
  return true;
}

// Idempotent: creates missing tables and enables TTL where the model needs it.
export async function ensureTables(
  client: DynamoDBClient,
  prefix: string,
  log: (message: string) => void = console.log,
): Promise<void> {
  const existing = await listTableNames(client);

  for (const key of Object.keys(TABLES) as TableKey[]) {
    const name = tableName(key, prefix);
    if (existing.has(name)) {
      log(`= ${name} (existe déjà)`);
    } else {
      await client.send(
        new CreateTableCommand({
          ...TABLES[key],
          TableName: name,
          BillingMode: "PAY_PER_REQUEST",
        }),
      );
      await waitUntilTableExists(
        { client, maxWaitTime: 60 },
        { TableName: name },
      );
      log(`+ ${name}`);
    }

    const ttlAttribute = TTL_ATTRIBUTES[key];
    if (ttlAttribute && (await ensureTtl(client, name, ttlAttribute))) {
      log(`  TTL activé sur ${name}.${ttlAttribute}`);
    }
  }
}

export async function dropTables(
  client: DynamoDBClient,
  prefix: string,
): Promise<void> {
  const existing = await listTableNames(client);
  const targets = (Object.keys(TABLES) as TableKey[])
    .map((key) => tableName(key, prefix))
    .filter((name) => existing.has(name));

  await Promise.all(
    targets.map(async (name) => {
      await client.send(new DeleteTableCommand({ TableName: name }));
      await waitUntilTableNotExists(
        { client, maxWaitTime: 60 },
        { TableName: name },
      );
    }),
  );
}
