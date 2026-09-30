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
    AttributeDefinitions: [
      s("userId"),
      s("productId"),
      s("feed"),
      s("updatedAt"),
    ],
    KeySchema: [hash("userId"), range("productId")],
    GlobalSecondaryIndexes: [
      gsi("byProduct", "productId", "userId"),
      // Every cart line (feed = "CART"), newest first: lists without a Scan.
      gsi("byFeed", "feed", "updatedAt"),
    ],
  },
  Wishlists: {
    AttributeDefinitions: [
      s("userId"),
      s("productId"),
      s("addedAt"),
      s("feed"),
    ],
    KeySchema: [hash("userId"), range("productId")],
    GlobalSecondaryIndexes: [
      gsi("byProduct", "productId", "addedAt"),
      gsi("byFeed", "feed", "addedAt"),
    ],
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
  // Every notification carries feed = "NOTIF": newest first without a Scan.
  Notifications: {
    AttributeDefinitions: [s("id"), s("feed"), s("createdAt")],
    KeySchema: [hash("id")],
    GlobalSecondaryIndexes: [gsi("byFeed", "feed", "createdAt")],
  },
} satisfies Record<string, TableDefinition>;

export type TableKey = keyof typeof TABLES;

// Epoch-seconds attributes DynamoDB uses to purge expired items.
export const TTL_ATTRIBUTES: Partial<Record<TableKey, string>> = {
  Sessions: "expiresAt",
  RateLimits: "expiresAt",
  Notifications: "expiresAt",
};

export function tableName(table: TableKey, prefix: string): string {
  return `${prefix}${table}`;
}

type IndexDefinition = ReturnType<typeof gsi>;

/**
 * Indexes of the data model that an existing table does not have yet, with
 * the attribute definitions DynamoDB needs to create them.
 */
export function missingIndexes(
  key: TableKey,
  existing: string[],
): (IndexDefinition & {
  attributes: { AttributeName: string; AttributeType: "S" | "N" }[];
})[] {
  const definition = TABLES[key] as TableDefinition;
  const indexes = (definition.GlobalSecondaryIndexes ??
    []) as IndexDefinition[];
  return indexes
    .filter((index) => !existing.includes(index.IndexName))
    .map((index) => ({
      ...index,
      attributes: (definition.AttributeDefinitions ?? []).filter((attr) =>
        index.KeySchema.some((k) => k.AttributeName === attr.AttributeName),
      ) as { AttributeName: string; AttributeType: "S" | "N" }[],
    }));
}
