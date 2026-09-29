import "server-only";
import {
  BatchWriteCommand,
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { db, table } from "@/lib/aws/dynamodb";
import type { AdminRole } from "./permissions";

export type SessionRecord = {
  /** SHA-256 of the cookie token. */
  pk: string;
  userId: string;
  role: AdminRole;
  email: string;
  name: string;
  createdAt: string;
  lastSeenAt: string;
  /** Epoch seconds, DynamoDB TTL attribute. */
  expiresAt: number;
  absoluteExpiresAt: number;
};

export async function createSession(session: SessionRecord): Promise<void> {
  await db().send(
    new PutCommand({
      TableName: table("Sessions"),
      Item: session,
      ConditionExpression: "attribute_not_exists(pk)",
    }),
  );
}

export async function findSession(
  tokenHash: string,
): Promise<SessionRecord | null> {
  const { Item } = await db().send(
    new GetCommand({
      TableName: table("Sessions"),
      Key: { pk: tokenHash },
      ConsistentRead: true,
    }),
  );
  return (Item as SessionRecord | undefined) ?? null;
}

export async function touchSession(
  tokenHash: string,
  expiresAt: number,
  lastSeenAt: string,
): Promise<void> {
  await db().send(
    new UpdateCommand({
      TableName: table("Sessions"),
      Key: { pk: tokenHash },
      UpdateExpression: "SET expiresAt = :expiresAt, lastSeenAt = :lastSeenAt",
      // Never resurrect a session deleted by a logout in the meantime.
      ConditionExpression: "attribute_exists(pk)",
      ExpressionAttributeValues: {
        ":expiresAt": expiresAt,
        ":lastSeenAt": lastSeenAt,
      },
    }),
  );
}

export async function deleteSession(tokenHash: string): Promise<void> {
  await db().send(
    new DeleteCommand({ TableName: table("Sessions"), Key: { pk: tokenHash } }),
  );
}

/** Signs a user out everywhere (suspension, role change, password reset). */
export async function deleteUserSessions(userId: string): Promise<number> {
  const keys: string[] = [];
  let startKey: Record<string, unknown> | undefined;
  do {
    const page = await db().send(
      new QueryCommand({
        TableName: table("Sessions"),
        IndexName: "byUser",
        KeyConditionExpression: "userId = :userId",
        ExpressionAttributeValues: { ":userId": userId },
        ProjectionExpression: "pk",
        ExclusiveStartKey: startKey,
      }),
    );
    for (const item of page.Items ?? []) keys.push(item.pk as string);
    startKey = page.LastEvaluatedKey;
  } while (startKey);

  for (let i = 0; i < keys.length; i += 25) {
    const batch = keys.slice(i, i + 25);
    let pending: Record<string, unknown>[] | undefined = batch.map((pk) => ({
      DeleteRequest: { Key: { pk } },
    }));
    // Retry items DynamoDB could not process in this round.
    while (pending?.length) {
      const result = await db().send(
        new BatchWriteCommand({
          RequestItems: { [table("Sessions")]: pending },
        }),
      );
      pending = result.UnprocessedItems?.[table("Sessions")] as
        Record<string, unknown>[] | undefined;
    }
  }
  return keys.length;
}
