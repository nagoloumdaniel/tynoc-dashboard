import "server-only";
import { randomUUID } from "node:crypto";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { db, table } from "@/lib/aws/dynamodb";

export type AuditAction =
  | "LOGIN"
  | "LOGOUT"
  | "CREATE"
  | "UPDATE"
  | "ARCHIVE"
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

export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  await db().send(
    new PutCommand({
      TableName: table("AuditLogs"),
      Item: buildAuditLogItem(entry),
    }),
  );
}
