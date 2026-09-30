import { randomUUID } from "node:crypto";
import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { beforeAll, describe, expect, it } from "vitest";
import { createCategory } from "@/features/categories/service";
import { ROOT_PARENT } from "@/features/categories/types";
import { createProduct } from "@/features/products/service";
import { createUser } from "@/features/users/repository";
import { queryEntityActivity } from "@/lib/audit/audit-log";
import { db, table } from "@/lib/aws/dynamodb";
import type { Session } from "@/lib/auth/session";
import {
  emptyLines,
  getCart,
  getWishlist,
  listCarts,
  listWishlists,
  removeLine,
} from "./service";

const actor: Session = {
  userId: "usr_admin",
  email: "admin@example.com",
  name: "Admin",
  role: "ADMIN",
};

let categoryId: string;

beforeAll(async () => {
  categoryId = (
    await createCategory(actor, {
      name: "Paniers",
      slug: `paniers-${randomUUID().slice(0, 8)}`,
      description: undefined,
      parentId: ROOT_PARENT,
      sortOrder: 1,
      isActive: true,
    })
  ).id;
});

async function product(priceInCents: number, stock: number) {
  const unique = randomUUID().slice(0, 8);
  return createProduct(actor, {
    name: `Article ${unique}`,
    slug: `article-${unique}`,
    sku: `ART-${unique.toUpperCase()}`,
    description: undefined,
    categoryId,
    priceInCents,
    salePriceInCents: undefined,
    stock,
    lowStockThreshold: 1,
    status: "ACTIVE",
  });
}

async function customer() {
  const unique = randomUUID().slice(0, 8);
  return createUser({
    name: `Client ${unique}`,
    email: `client.${unique}@exemple.fr`,
    role: "CUSTOMER",
  });
}

async function addToCart(
  userId: string,
  productId: string,
  quantity: number,
  updatedAt: string,
) {
  await db().send(
    new PutCommand({
      TableName: table("Carts"),
      Item: {
        userId,
        productId,
        quantity,
        addedAt: updatedAt,
        updatedAt,
        feed: "CART",
      },
    }),
  );
}

async function addToWishlist(
  userId: string,
  productId: string,
  addedAt: string,
) {
  await db().send(
    new PutCommand({
      TableName: table("Wishlists"),
      Item: { userId, productId, addedAt, feed: "WISHLIST" },
    }),
  );
}

async function counter(name: "cartItems" | "wishlistItems") {
  const { Item } = await db().send(
    new GetCommand({
      TableName: table("Stats"),
      Key: { pk: "GLOBAL" },
      ConsistentRead: true,
    }),
  );
  return Number(Item?.[name] ?? 0);
}

const daysAgo = (days: number) =>
  new Date(Date.now() - days * 86_400_000).toISOString();

describe("cart service", () => {
  it("lists carts from the feed index with customer, value and abandonment", async () => {
    const [user, chair, lamp] = await Promise.all([
      customer(),
      product(5000, 10),
      product(2000, 1),
    ]);
    await addToCart(user.id, chair.id, 2, daysAgo(10));
    await addToCart(user.id, lamp.id, 3, daysAgo(9));

    const page = await listCarts({
      q: user.email,
      abandoned: "1",
      product: undefined,
      sort: "-updatedAt",
      page: 1,
    });

    expect(page.items).toHaveLength(1);
    expect(page.items[0]).toMatchObject({
      userId: user.id,
      lines: 2,
      quantity: 5,
      valueInCents: 16000,
      abandoned: true,
      unavailableLines: 1,
      customer: { name: user.name, email: user.email },
    });
  });

  it("finds the carts that contain a product", async () => {
    const [first, second, item] = await Promise.all([
      customer(),
      customer(),
      product(1000, 5),
    ]);
    await addToCart(first.id, item.id, 1, daysAgo(1));
    const other = await product(1000, 5);
    await addToCart(second.id, other.id, 1, daysAgo(1));

    const page = await listCarts({
      q: "",
      abandoned: undefined,
      product: item.id,
      sort: "-updatedAt",
      page: 1,
    });
    expect(page.items.map((row) => row.userId)).toEqual([first.id]);
  });

  it("details a cart with availability and subtotals", async () => {
    const [user, item] = await Promise.all([customer(), product(1500, 1)]);
    await addToCart(user.id, item.id, 2, daysAgo(1));
    await addToCart(user.id, "prd_deleted", 1, daysAgo(2));

    const cart = await getCart(user.id);

    expect(cart.customer?.email).toBe(user.email);
    expect(cart.items.map((i) => [i.availability, i.subtotalInCents])).toEqual([
      ["INSUFFICIENT", 3000],
      ["DELETED", 0],
    ]);
    expect(cart.summary.valueInCents).toBe(3000);
  });

  it("removes one line, decrements the counter and records it", async () => {
    const [user, item] = await Promise.all([customer(), product(1000, 5)]);
    await addToCart(user.id, item.id, 1, daysAgo(1));
    const before = await counter("cartItems");

    await removeLine(actor, "CART", user.id, item.id);

    expect((await getCart(user.id)).items).toHaveLength(0);
    expect(await counter("cartItems")).toBe(before - 1);
    const [entry] = await queryEntityActivity("CART", user.id, 1);
    expect(entry).toMatchObject({
      action: "REMOVE_ITEM",
      actorEmail: actor.email,
    });
  });

  it("reports a line that is already gone", async () => {
    const user = await customer();
    await expect(
      removeLine(actor, "CART", user.id, "prd_nope"),
    ).rejects.toMatchObject({ code: "ITEM_NOT_FOUND", status: 404 });
  });

  it("empties a wishlist", async () => {
    const [user, a, b] = await Promise.all([
      customer(),
      product(1000, 5),
      product(1000, 5),
    ]);
    await addToWishlist(user.id, a.id, daysAgo(3));
    await addToWishlist(user.id, b.id, daysAgo(1));
    const before = await counter("wishlistItems");

    const listed = await listWishlists({
      q: user.email,
      sort: "-addedAt",
      page: 1,
    });
    expect(listed.items[0]).toMatchObject({ userId: user.id, count: 2 });

    expect(await emptyLines(actor, "WISHLIST", user.id)).toBe(2);
    expect((await getWishlist(user.id)).items).toHaveLength(0);
    expect(await counter("wishlistItems")).toBe(before - 2);
  });
});
