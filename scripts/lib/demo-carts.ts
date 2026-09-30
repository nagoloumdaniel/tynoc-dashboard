import { GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { findUserByEmail } from "../../src/features/users/repository";
import { db, table } from "../../src/lib/aws/dynamodb";
import { isConditionFailure } from "../../src/lib/aws/errors";
import { DEMO_CUSTOMERS } from "./demo-customers";
import { DEMO_PRODUCTS } from "./demo-products";

const DAY = 86_400_000;

async function productIdBySku(sku: string): Promise<string | undefined> {
  const { Item } = await db().send(
    new GetCommand({ TableName: table("Uniques"), Key: { pk: `SKU#${sku}` } }),
  );
  return Item?.productId as string | undefined;
}

/** Writes a line unless it exists; returns whether it was created. */
async function putOnce(
  tableKey: "Carts" | "Wishlists",
  item: Record<string, unknown>,
) {
  try {
    await db().send(
      new PutCommand({
        TableName: table(tableKey),
        Item: item,
        ConditionExpression: "attribute_not_exists(userId)",
      }),
    );
    return true;
  } catch (error) {
    if (isConditionFailure(error)) return false;
    throw error;
  }
}

/**
 * Deterministic carts (15 customers, some untouched for more than 7 days)
 * and wishlists (20 customers), written as the shop would: with `feed`.
 */
export async function seedDemoCarts(now = Date.now()) {
  const skus = DEMO_PRODUCTS.map((p) => p.input.sku);
  const productIds = (await Promise.all(skus.map(productIdBySku))).filter(
    (id): id is string => Boolean(id),
  );
  let cartLines = 0;
  let wishlistLines = 0;

  for (const [index, demo] of DEMO_CUSTOMERS.entries()) {
    const user = await findUserByEmail(demo.email);
    if (!user) continue;

    if (index < 15) {
      const updatedAt = new Date(now - index * 1.3 * DAY).toISOString();
      for (let n = 0; n < (index % 3) + 1; n++) {
        const productId = productIds[(index * 7 + n * 5) % productIds.length];
        const created = await putOnce("Carts", {
          userId: user.id,
          productId,
          quantity: ((index + n) % 3) + 1,
          addedAt: updatedAt,
          updatedAt,
          feed: "CART",
        });
        if (created) cartLines++;
      }
    }
    if (index < 20) {
      for (let n = 0; n < (index % 4) + 1; n++) {
        const productId = productIds[(index * 3 + n * 11) % productIds.length];
        const created = await putOnce("Wishlists", {
          userId: user.id,
          productId,
          addedAt: new Date(now - (index + n) * 2 * DAY).toISOString(),
          feed: "WISHLIST",
        });
        if (created) wishlistLines++;
      }
    }
  }

  await db().send(
    new UpdateCommand({
      TableName: table("Stats"),
      Key: { pk: "GLOBAL" },
      UpdateExpression: "ADD cartItems :c, wishlistItems :w",
      ExpressionAttributeValues: { ":c": cartLines, ":w": wishlistLines },
    }),
  );
  return { cartLines, wishlistLines };
}
