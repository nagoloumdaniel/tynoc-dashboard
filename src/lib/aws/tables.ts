import type { CreateTableCommandInput } from "@aws-sdk/client-dynamodb";

type TableDefinition = Omit<
  CreateTableCommandInput,
  "TableName" | "BillingMode"
>;

const s = (name: string) => ({
  AttributeName: name,
  AttributeType: "S" as const,
});
const n = (name: string) => ({
  AttributeName: name,
  AttributeType: "N" as const,
});
const hash = (name: string) => ({
  AttributeName: name,
  KeyType: "HASH" as const,
});
const range = (name: string) => ({
  AttributeName: name,
  KeyType: "RANGE" as const,
});
const gsi = (IndexName: string, pk: string, sk?: string) => ({
  IndexName,
  KeySchema: sk ? [hash(pk), range(sk)] : [hash(pk)],
  Projection: { ProjectionType: "ALL" as const },
});

// Access patterns: see ROADMAP.md § 6.2.
export const TABLES = {
  Products: {
    AttributeDefinitions: [
      s("id"),
      s("categoryId"),
      s("createdAt"),
      s("status"),
      s("nameNormalized"),
      s("sku"),
    ],
    KeySchema: [hash("id")],
    GlobalSecondaryIndexes: [
      gsi("byCategory", "categoryId", "createdAt"),
      gsi("byStatus", "status", "nameNormalized"),
      gsi("bySku", "sku"),
    ],
  },
  Categories: {
    AttributeDefinitions: [s("id"), s("slug"), s("parentId"), n("sortOrder")],
    KeySchema: [hash("id")],
    GlobalSecondaryIndexes: [
      gsi("bySlug", "slug"),
      gsi("byParent", "parentId", "sortOrder"),
    ],
  },
  Users: {
    AttributeDefinitions: [
      s("id"),
      s("email"),
      s("role"),
      s("status"),
      s("createdAt"),
    ],
    KeySchema: [hash("id")],
    GlobalSecondaryIndexes: [
      gsi("byEmail", "email"),
      gsi("byRole", "role", "createdAt"),
      gsi("byStatus", "status", "createdAt"),
    ],
  },
  Carts: {
    AttributeDefinitions: [s("userId"), s("productId")],
    KeySchema: [hash("userId"), range("productId")],
    GlobalSecondaryIndexes: [gsi("byProduct", "productId", "userId")],
  },
  Wishlists: {
    AttributeDefinitions: [s("userId"), s("productId"), s("addedAt")],
    KeySchema: [hash("userId"), range("productId")],
    GlobalSecondaryIndexes: [gsi("byProduct", "productId", "addedAt")],
  },
  AuditLogs: {
    AttributeDefinitions: [
      s("pk"),
      s("sk"),
      s("feed"),
      s("createdAt"),
      s("actorId"),
    ],
    KeySchema: [hash("pk"), range("sk")],
    GlobalSecondaryIndexes: [
      gsi("byFeed", "feed", "createdAt"),
      gsi("byActor", "actorId", "createdAt"),
    ],
  },
  Stats: {
    AttributeDefinitions: [s("pk")],
    KeySchema: [hash("pk")],
  },
  Uniques: {
    AttributeDefinitions: [s("pk")],
    KeySchema: [hash("pk")],
  },
  Sessions: {
    AttributeDefinitions: [s("pk"), s("userId")],
    KeySchema: [hash("pk")],
    GlobalSecondaryIndexes: [gsi("byUser", "userId")],
  },
  RateLimits: {
    AttributeDefinitions: [s("pk")],
    KeySchema: [hash("pk")],
  },
} satisfies Record<string, TableDefinition>;

export type TableKey = keyof typeof TABLES;

// Epoch-seconds attributes DynamoDB uses to purge expired items.
export const TTL_ATTRIBUTES: Partial<Record<TableKey, string>> = {
  Sessions: "expiresAt",
  RateLimits: "expiresAt",
};

export function tableName(table: TableKey, prefix: string): string {
  return `${prefix}${table}`;
}
