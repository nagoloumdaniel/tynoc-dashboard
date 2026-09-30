import "server-only";
import { BatchGetCommand } from "@aws-sdk/lib-dynamodb";
import { db, table } from "./dynamodb";
import type { TableKey } from "./tables";

/**
 * Reads many items by key, 100 per request (DynamoDB limit), retrying the
 * keys DynamoDB leaves unprocessed. Missing items are simply absent.
 */
export async function batchGet<T>(
  tableKey: TableKey,
  keys: Record<string, unknown>[],
  projection: { expression: string; names?: Record<string, string> },
): Promise<T[]> {
  const items: T[] = [];
  const name = table(tableKey);
  for (let i = 0; i < keys.length; i += 100) {
    let pending: Record<string, unknown>[] | undefined = keys.slice(i, i + 100);
    while (pending?.length) {
      const result = await db().send(
        new BatchGetCommand({
          RequestItems: {
            [name]: {
              Keys: pending,
              ProjectionExpression: projection.expression,
              ExpressionAttributeNames: projection.names,
            },
          },
        }),
      );
      items.push(...((result.Responses?.[name] ?? []) as T[]));
      pending = result.UnprocessedKeys?.[name]?.Keys as
        Record<string, unknown>[] | undefined;
    }
  }
  return items;
}
