import "server-only";
import { randomUUID } from "node:crypto";
import { PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { db, table } from "@/lib/aws/dynamodb";
import type { TaggedItem } from "@/lib/aws/transaction";

export type AuditAction =
  | "LOGIN"
  | "LOGOUT"
  | "CREATE"
  | "UPDATE"
  | "ARCHIVE"
  | "RESTORE"
  | "ACTIVATE"
  | "DEACTIVATE"
  | "REACTIVATE"
  | "PASSWORD_RESET"
  | "PASSWORD_CHANGE"
  | "ANONYMIZE"
  | "REMOVE_ITEM"
  | "EMPTY"
  | "DELETE"
  | "STOCK_ADJUST"
  | "ROLE_CHANGE"
  | "SUSPEND";

export type AuditEntityType =
  "PRODUCT" | "CATEGORY" | "USER" | "CART" | "WISHLIST";

export type AuditEntry = {
  actorId: string;
  actorEmail: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  summary: string;
  /** Never put secrets or personal data here. */
  changes?: Record<string, { from: unknown; to: unknown }>;
};

export function buildAuditLogItem(entry: AuditEntry, now = new Date()) {
  const id = `log_${randomUUID()}`;
  const createdAt = now.toISOString();
  return {
    ...entry,
    pk: `${entry.entityType}#${entry.entityId}`,
    sk: `${createdAt}#${id}`,
    // Single partition of the global chronological feed (GSI byFeed).
    feed: "LOG",
    id,
    createdAt,
  };
}

/** Audit entry written in the same transaction as the change it records. */
export function auditOp(entry: AuditEntry): TaggedItem {
  return {
    tag: "audit",
    item: {
      Put: { TableName: table("AuditLogs"), Item: buildAuditLogItem(entry) },
    },
  };
}

export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  await db().send(
    new PutCommand({
      TableName: table("AuditLogs"),
      Item: buildAuditLogItem(entry),
    }),
  );
}

export type ActivityEntry = {
  id: string;
  action: AuditAction;
  actorEmail: string;
  summary: string;
  createdAt: string;
};

/** Latest audit entries about one entity, newest first. */
export async function queryEntityActivity(
  entityType: AuditEntityType,
  entityId: string,
  limit: number,
): Promise<ActivityEntry[]> {
  const { Items } = await db().send(
    new QueryCommand({
      TableName: table("AuditLogs"),
      KeyConditionExpression: "pk = :pk",
      ExpressionAttributeValues: { ":pk": `${entityType}#${entityId}` },
      ProjectionExpression: "id, #action, actorEmail, summary, createdAt",
      ExpressionAttributeNames: { "#action": "action" },
      ScanIndexForward: false,
      Limit: limit,
    }),
  );
  return (Items ?? []) as ActivityEntry[];
}
