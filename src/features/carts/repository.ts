import "server-only";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { batchGet } from "@/lib/aws/batch-get";
import { db, table } from "@/lib/aws/dynamodb";
import type { CartLine, ProductSnapshot, WishlistLine } from "./types";

type LineTable = "Carts" | "Wishlists";

async function queryAll<T>(
  input: ConstructorParameters<typeof QueryCommand>[0],
) {
  const items: T[] = [];
  let startKey: Record<string, unknown> | undefined;
  do {
    const page = await db().send(
      new QueryCommand({ ...input, ExclusiveStartKey: startKey }),
    );
    items.push(...((page.Items ?? []) as T[]));
    startKey = page.LastEvaluatedKey;
  } while (startKey);
  return items;
}

const FIELDS: Record<LineTable, string> = {
  Carts: "userId, productId, quantity, addedAt, updatedAt",
  Wishlists: "userId, productId, addedAt",
};

/** Every line of every customer, via the byFeed index (no Scan). */
export function queryAllCartLines() {
  return queryAll<CartLine>({
    TableName: table("Carts"),
    IndexName: "byFeed",
    KeyConditionExpression: "feed = :feed",
    ExpressionAttributeValues: { ":feed": "CART" },
    ProjectionExpression: FIELDS.Carts,
  });
}

export function queryAllWishlistLines() {
  return queryAll<WishlistLine>({
    TableName: table("Wishlists"),
    IndexName: "byFeed",
    KeyConditionExpression: "feed = :feed",
    ExpressionAttributeValues: { ":feed": "WISHLIST" },
    ProjectionExpression: FIELDS.Wishlists,
  });
}

export function queryUserLines<T>(tableKey: LineTable, userId: string) {
  return queryAll<T>({
    TableName: table(tableKey),
    KeyConditionExpression: "userId = :id",
    ExpressionAttributeValues: { ":id": userId },
    ProjectionExpression: FIELDS[tableKey],
    ConsistentRead: true,
  });
}

export async function readProducts(
  ids: string[],
): Promise<Map<string, ProductSnapshot>> {
  const products = await batchGet<ProductSnapshot>(
    "Products",
    [...new Set(ids)].map((id) => ({ id })),
    {
      expression:
        "id, #name, sku, priceInCents, salePriceInCents, stock, #status, imageKeys",
      names: { "#name": "name", "#status": "status" },
    },
  );
  return new Map(products.map((p) => [p.id, p]));
}

export async function readCustomers(
  ids: string[],
): Promise<Map<string, { name: string; email: string }>> {
  const users = await batchGet<{ id: string; name: string; email: string }>(
    "Users",
    [...new Set(ids)].map((id) => ({ id })),
    { expression: "id, #name, email", names: { "#name": "name" } },
  );
  return new Map(users.map(({ id, name, email }) => [id, { name, email }]));
}
