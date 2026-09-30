import "server-only";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import type { AuditAction, AuditEntityType } from "@/lib/audit/actions";
import { ADMIN_ROLES } from "@/lib/auth/permissions";
import { db, table } from "@/lib/aws/dynamodb";
import { periodRanges } from "@/features/dashboard/period";
import { decodeCursor, encodeCursor } from "./cursor";
import type { ActivityQuery } from "./schemas";

export type ActivityItem = {
  id: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  summary: string;
  actorEmail: string;
  createdAt: string;
  changes?: Record<string, { from: unknown; to: unknown }>;
};

type Row = ActivityItem & { pk: string; sk: string; feed: string };

/** Everyone who can write to the log, for the author filter. */
export async function listActors(): Promise<{ email: string; name: string }[]> {
  const actors: { email: string; name: string }[] = [];
  for (const role of ADMIN_ROLES) {
    let startKey: Record<string, unknown> | undefined;
    do {
      const page = await db().send(
        new QueryCommand({
          TableName: table("Users"),
          IndexName: "byRole",
          KeyConditionExpression: "#role = :role",
          ExpressionAttributeNames: { "#role": "role", "#name": "name" },
          ExpressionAttributeValues: { ":role": role },
          ProjectionExpression: "email, #name",
          ExclusiveStartKey: startKey,
        }),
      );
      actors.push(...((page.Items ?? []) as { email: string; name: string }[]));
      startKey = page.LastEvaluatedKey;
    } while (startKey);
  }
  return actors.sort((a, b) => a.email.localeCompare(b.email));
}

export const ACTIVITY_PAGE_SIZE = 25;
// A filter may discard most rows of a DynamoDB page: bound the reads.
const MAX_READS = 10;

/**
 * Newest first, from the log's byFeed index. Filters run in DynamoDB; the
 * page is topped up across reads until it is full or the window is exhausted.
 */
export async function listActivity(
  query: ActivityQuery,
  cursor?: string,
  pageSize = ACTIVITY_PAGE_SIZE,
): Promise<{ items: ActivityItem[]; nextCursor: string | null }> {
  const filters: string[] = [];
  const names: Record<string, string> = { "#action": "action" };
  const values: Record<string, unknown> = {
    ":feed": "LOG",
    ":from": periodRanges(query.period).current.from,
  };
  if (query.entity) {
    filters.push("entityType = :entity");
    values[":entity"] = query.entity;
  }
  if (query.action) {
    filters.push("#action = :action");
    values[":action"] = query.action;
  }
  if (query.actor) {
    filters.push("actorEmail = :actor");
    values[":actor"] = query.actor;
  }

  const items: Row[] = [];
  let startKey: Record<string, unknown> | undefined =
    (cursor && decodeCursor(cursor)) || undefined;

  for (let read = 0; read < MAX_READS && items.length < pageSize; read++) {
    const page = await db().send(
      new QueryCommand({
        TableName: table("AuditLogs"),
        IndexName: "byFeed",
        KeyConditionExpression: "feed = :feed AND createdAt >= :from",
        FilterExpression: filters.length ? filters.join(" AND ") : undefined,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        ProjectionExpression:
          "pk, sk, feed, id, #action, entityType, entityId, summary, actorEmail, createdAt, changes",
        ScanIndexForward: false,
        Limit: pageSize - items.length,
        ExclusiveStartKey: startKey,
      }),
    );
    items.push(...((page.Items ?? []) as Row[]));
    startKey = page.LastEvaluatedKey;
    if (!startKey) break;
  }

  return {
    // Keys stay server-side: the cursor is the only pagination handle.
    items: items.map(({ pk: _pk, sk: _sk, feed: _feed, ...item }) => item),
    nextCursor: startKey
      ? encodeCursor(startKey as Parameters<typeof encodeCursor>[0])
      : null,
  };
}
