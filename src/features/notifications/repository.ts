import "server-only";
import { randomUUID } from "node:crypto";
import {
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { db, table } from "@/lib/aws/dynamodb";
import type { TaggedItem } from "@/lib/aws/transaction";
import type { NotificationInput } from "./events";

export const FEED = "NOTIF";
const RETENTION_S = 30 * 24 * 60 * 60;
export const FEED_LIMIT = 20;
export const MAX_UNREAD = 99;
// A filter may discard most rows of a page: bound the reads.
const MAX_READS = 10;

export type NotificationItem = NotificationInput & {
  id: string;
  createdAt: string;
};

function buildItem(input: NotificationInput, now: Date) {
  return {
    ...input,
    id: `ntf_${randomUUID()}`,
    feed: FEED,
    createdAt: now.toISOString(),
    // TTL: DynamoDB purges notifications after 30 days.
    expiresAt: Math.floor(now.getTime() / 1000) + RETENTION_S,
  };
}

/** Recorded in the same transaction as the action it reports. */
export function notificationOp(
  input: NotificationInput,
  now = new Date(),
): TaggedItem {
  return {
    tag: "notification",
    item: {
      Put: { TableName: table("Notifications"), Item: buildItem(input, now) },
    },
  };
}

/** For events outside a transaction (login blocking). */
export async function recordNotification(
  input: NotificationInput,
  now = new Date(),
): Promise<void> {
  await db().send(
    new PutCommand({
      TableName: table("Notifications"),
      Item: buildItem(input, now),
    }),
  );
}

// Nobody is notified of their own actions.
const NOT_MINE = "(attribute_not_exists(actorId) OR actorId <> :me)";

/** Newest first, from `since` when given, hiding the reader's own actions. */
export async function queryNotifications(
  userId: string,
  { since, limit = FEED_LIMIT }: { since?: string; limit?: number } = {},
): Promise<NotificationItem[]> {
  const items: NotificationItem[] = [];
  let startKey: Record<string, unknown> | undefined;
  for (let read = 0; read < MAX_READS && items.length < limit; read++) {
    const page = await db().send(
      new QueryCommand({
        TableName: table("Notifications"),
        IndexName: "byFeed",
        // >= : two notifications may share a millisecond; the client
        // de-duplicates by id.
        KeyConditionExpression: since
          ? "feed = :feed AND createdAt >= :since"
          : "feed = :feed",
        FilterExpression: NOT_MINE,
        ExpressionAttributeValues: {
          ":feed": FEED,
          ":me": userId,
          ...(since ? { ":since": since } : {}),
        },
        ProjectionExpression:
          "id, #type, title, body, href, severity, actorId, createdAt",
        ExpressionAttributeNames: { "#type": "type" },
        ScanIndexForward: false,
        Limit: limit,
        ExclusiveStartKey: startKey,
      }),
    );
    items.push(...((page.Items ?? []) as NotificationItem[]));
    startKey = page.LastEvaluatedKey;
    if (!startKey) break;
  }
  return items.slice(0, limit);
}

/** Notifications newer than `readAt` for this reader, capped at 99. */
export async function countUnread(
  userId: string,
  readAt: string | undefined,
): Promise<number> {
  let count = 0;
  let startKey: Record<string, unknown> | undefined;
  do {
    const page = await db().send(
      new QueryCommand({
        TableName: table("Notifications"),
        IndexName: "byFeed",
        KeyConditionExpression: readAt
          ? "feed = :feed AND createdAt > :readAt"
          : "feed = :feed",
        FilterExpression: NOT_MINE,
        ExpressionAttributeValues: {
          ":feed": FEED,
          ":me": userId,
          ...(readAt ? { ":readAt": readAt } : {}),
        },
        Select: "COUNT",
        ExclusiveStartKey: startKey,
      }),
    );
    count += page.Count ?? 0;
    startKey = page.LastEvaluatedKey;
  } while (startKey && count < MAX_UNREAD);
  return Math.min(count, MAX_UNREAD);
}

export async function readNotificationsReadAt(
  userId: string,
): Promise<string | undefined> {
  const { Item } = await db().send(
    new GetCommand({
      TableName: table("Users"),
      Key: { id: userId },
      ProjectionExpression: "notificationsReadAt",
    }),
  );
  return Item?.notificationsReadAt as string | undefined;
}

/**
 * Not a new version of the account (no audit, no version bump): only the
 * reader's position in the feed.
 */
export async function writeNotificationsReadAt(
  userId: string,
  readAt: string,
): Promise<void> {
  await db().send(
    new UpdateCommand({
      TableName: table("Users"),
      Key: { id: userId },
      UpdateExpression: "SET notificationsReadAt = :readAt",
      ConditionExpression: "attribute_exists(id)",
      ExpressionAttributeValues: { ":readAt": readAt },
    }),
  );
}
