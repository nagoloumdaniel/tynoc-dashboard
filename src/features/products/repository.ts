import "server-only";
import { GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { db, table } from "@/lib/aws/dynamodb";
import type { TaggedItem } from "@/lib/aws/transaction";
import type { StatsDelta } from "./stats";
import {
  LIST_FIELDS,
  type Product,
  type ProductListItem,
  type ProductStatus,
} from "./types";

export const skuKey = (sku: string) => `SKU#${sku}`;
export const slugKey = (slug: string) => `PRODUCT_SLUG#${slug}`;

export async function findProduct(id: string): Promise<Product | null> {
  const { Item } = await db().send(
    new GetCommand({
      TableName: table("Products"),
      Key: { id },
      ConsistentRead: true,
    }),
  );
  return (Item as Product | undefined) ?? null;
}

/** Every product of one status, list fields only (index byStatus). */
export async function queryProductsByStatus(
  status: ProductStatus,
): Promise<ProductListItem[]> {
  const names = Object.fromEntries(
    LIST_FIELDS.map((field) => [`#${field}`, field]),
  );
  const items: ProductListItem[] = [];
  let startKey: Record<string, unknown> | undefined;
  do {
    const page = await db().send(
      new QueryCommand({
        TableName: table("Products"),
        IndexName: "byStatus",
        KeyConditionExpression: "#status = :status",
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: { ":status": status },
        ProjectionExpression: Object.keys(names).join(", "),
        ExclusiveStartKey: startKey,
      }),
    );
    items.push(...((page.Items ?? []) as ProductListItem[]));
    startKey = page.LastEvaluatedKey;
  } while (startKey);
  return items;
}

async function countByProduct(
  tableKey: "Carts" | "Wishlists",
  productId: string,
): Promise<number> {
  let count = 0;
  let startKey: Record<string, unknown> | undefined;
  do {
    const page = await db().send(
      new QueryCommand({
        TableName: table(tableKey),
        IndexName: "byProduct",
        KeyConditionExpression: "productId = :id",
        ExpressionAttributeValues: { ":id": productId },
        Select: "COUNT",
        ExclusiveStartKey: startKey,
      }),
    );
    count += page.Count ?? 0;
    startKey = page.LastEvaluatedKey;
  } while (startKey);
  return count;
}

export async function countProductUsage(productId: string) {
  const [carts, wishlists] = await Promise.all([
    countByProduct("Carts", productId),
    countByProduct("Wishlists", productId),
  ]);
  return { carts, wishlists };
}

// ---- Transaction building blocks -------------------------------------------

export function reserveUniqueOp(
  tag: string,
  pk: string,
  productId: string,
): TaggedItem {
  return {
    tag,
    item: {
      Put: {
        TableName: table("Uniques"),
        Item: { pk, productId },
        ConditionExpression: "attribute_not_exists(pk)",
      },
    },
  };
}

export function releaseUniqueOp(tag: string, pk: string): TaggedItem {
  return {
    tag,
    item: { Delete: { TableName: table("Uniques"), Key: { pk } } },
  };
}

/** ADD operations on the dashboard counters; zero changes are skipped. */
export function statsOps(delta: StatsDelta): TaggedItem[] {
  const ops: TaggedItem[] = [];
  const global = Object.entries({
    totalProducts: delta.totalProducts,
    outOfStock: delta.outOfStock,
    lowStock: delta.lowStock,
  }).filter(([, value]) => value !== 0);

  if (global.length > 0) {
    ops.push({
      tag: "stats",
      item: {
        Update: {
          TableName: table("Stats"),
          Key: { pk: "GLOBAL" },
          UpdateExpression: `ADD ${global.map(([key]) => `${key} :${key}`).join(", ")}`,
          ExpressionAttributeValues: Object.fromEntries(
            global.map(([key, value]) => [`:${key}`, value]),
          ),
        },
      },
    });
  }

  for (const [categoryId, change] of Object.entries(delta.categories)) {
    ops.push({
      tag: "stats",
      item: {
        Update: {
          TableName: table("Stats"),
          Key: { pk: `CATEGORY#${categoryId}` },
          UpdateExpression: "ADD productCount :change",
          ExpressionAttributeValues: { ":change": change },
        },
      },
    });
  }
  return ops;
}
