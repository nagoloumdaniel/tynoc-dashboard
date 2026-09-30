import {
  CreateTableCommand,
  DeleteTableCommand,
  DescribeTableCommand,
  DescribeTimeToLiveCommand,
  type DynamoDBClient,
  ListTablesCommand,
  UpdateTableCommand,
  UpdateTimeToLiveCommand,
  waitUntilTableExists,
  waitUntilTableNotExists,
} from "@aws-sdk/client-dynamodb";
import {
  missingIndexes,
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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Adds indexes introduced after a table was created. DynamoDB builds one
 * index at a time per UpdateTable call, so each is awaited until ACTIVE.
 */
async function addMissingIndexes(
  client: DynamoDBClient,
  key: TableKey,
  name: string,
  log: (message: string) => void,
) {
  const { Table } = await client.send(
    new DescribeTableCommand({ TableName: name }),
  );
  const existing = (Table?.GlobalSecondaryIndexes ?? []).map(
    (i) => i.IndexName ?? "",
  );

  for (const index of missingIndexes(key, existing)) {
    const { attributes, ...definition } = index;
    await client.send(
      new UpdateTableCommand({
        TableName: name,
        AttributeDefinitions: attributes,
        GlobalSecondaryIndexUpdates: [{ Create: definition }],
      }),
    );
    log(`  + index ${definition.IndexName} sur ${name} (construction…)`);
    // On AWS an index takes minutes to build, even on an empty table.
    const deadline = Date.now() + 15 * 60_000;
    let status: string | undefined;
    while (Date.now() < deadline) {
      const { Table: table } = await client.send(
        new DescribeTableCommand({ TableName: name }),
      );
      status = table?.GlobalSecondaryIndexes?.find(
        (i) => i.IndexName === definition.IndexName,
      )?.IndexStatus;
      if (status === "ACTIVE") break;
      await sleep(10_000);
      log(`  … ${definition.IndexName} : ${status ?? "en attente"}`);
    }
    if (status !== "ACTIVE") {
      throw new Error(
        `L'index ${definition.IndexName} de ${name} n'est pas encore actif. Relancez la commande plus tard : elle reprend où elle en est.`,
      );
    }
    log(`  index ${definition.IndexName} actif`);
  }
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
      await addMissingIndexes(client, key, name, log);
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
