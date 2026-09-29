import { randomUUID } from "node:crypto";
import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { beforeAll, describe, expect, it } from "vitest";
import { createCategory } from "@/features/categories/repository";
import { db, table } from "@/lib/aws/dynamodb";
import type { Session } from "@/lib/auth/session";
import type { ProductCreateInput } from "./schemas";
import {
  adjustStock,
  archiveProduct,
  createProduct,
  deleteProduct,
  getProduct,
  getProductActivity,
  getProductUsage,
  listProducts,
  restoreProduct,
  updateProduct,
} from "./service";

const actor: Session = {
  userId: "usr_test",
  email: "admin@example.com",
  name: "Admin",
  role: "SUPER_ADMIN",
};

let categoryA: string;
let categoryB: string;
let inactiveCategory: string;

beforeAll(async () => {
  const suffix = randomUUID().slice(0, 8);
  categoryA = (
    await createCategory({ name: "A", slug: `a-${suffix}`, sortOrder: 1 })
  ).id;
  categoryB = (
    await createCategory({ name: "B", slug: `b-${suffix}`, sortOrder: 2 })
  ).id;
  inactiveCategory = (
    await createCategory({
      name: "Off",
      slug: `off-${suffix}`,
      sortOrder: 3,
      isActive: false,
    })
  ).id;
});

function input(
  overrides: Partial<ProductCreateInput> = {},
): ProductCreateInput {
  const unique = randomUUID().slice(0, 8);
  return {
    name: `Chaise ${unique}`,
    slug: `chaise-${unique}`,
    sku: `CHS-${unique.toUpperCase()}`,
    description: undefined,
    categoryId: categoryA,
    priceInCents: 12990,
    salePriceInCents: undefined,
    stock: 10,
    lowStockThreshold: 5,
    status: "ACTIVE",
    ...overrides,
  };
}

const update = ({ stock: _stock, ...rest }: ProductCreateInput) => rest;

async function readStats(pk: string) {
  const { Item } = await db().send(
    new GetCommand({
      TableName: table("Stats"),
      Key: { pk },
      ConsistentRead: true,
    }),
  );
  return {
    totalProducts: Item?.totalProducts ?? 0,
    outOfStock: Item?.outOfStock ?? 0,
    lowStock: Item?.lowStock ?? 0,
    productCount: Item?.productCount ?? 0,
  };
}

describe("product service", () => {
  it("creates a product and reads it back", async () => {
    const values = input();
    const product = await createProduct(actor, values);

    expect(product).toMatchObject({
      ...values,
      nameNormalized: values.name.toLowerCase(),
      imageKeys: [],
      version: 1,
    });
    expect(product.id).toMatch(/^prd_/);
    expect(await getProduct(product.id)).toEqual(product);
  });

  it("refuses a duplicate SKU or slug", async () => {
    const first = await createProduct(actor, input());
    await expect(
      createProduct(actor, input({ sku: first.sku })),
    ).rejects.toMatchObject({ code: "SKU_TAKEN", status: 409 });
    await expect(
      createProduct(actor, input({ slug: first.slug })),
    ).rejects.toMatchObject({ code: "SLUG_TAKEN", status: 409 });
  });

  it("refuses an unknown or inactive category", async () => {
    await expect(
      createProduct(actor, input({ categoryId: "cat_nope" })),
    ).rejects.toMatchObject({ code: "CATEGORY_INVALID" });
    await expect(
      createProduct(actor, input({ categoryId: inactiveCategory })),
    ).rejects.toMatchObject({ code: "CATEGORY_INVALID" });
  });

  it("updates a product and frees its old SKU", async () => {
    const values = input();
    const product = await createProduct(actor, values);
    const newSku = `NEW-${randomUUID().slice(0, 8).toUpperCase()}`;

    const updated = await updateProduct(actor, product.id, 1, {
      ...update(values),
      name: "Fauteuil",
      sku: newSku,
    });

    expect(updated).toMatchObject({
      name: "Fauteuil",
      sku: newSku,
      version: 2,
    });
    // The old SKU can be reused by another product.
    await expect(
      createProduct(actor, input({ sku: values.sku })),
    ).resolves.toBeTruthy();
  });

  it("detects a concurrent modification", async () => {
    const values = input();
    const product = await createProduct(actor, values);
    await updateProduct(actor, product.id, 1, {
      ...update(values),
      name: "V2",
    });

    await expect(
      updateProduct(actor, product.id, 1, { ...update(values), name: "Stale" }),
    ).rejects.toMatchObject({ code: "VERSION_CONFLICT", status: 409 });
  });

  it("adjusts stock by delta or absolute value and never below zero", async () => {
    const product = await createProduct(actor, input({ stock: 10 }));

    const restocked = await adjustStock(actor, product.id, 1, {
      mode: "DELTA",
      quantity: 5,
      reason: "RESTOCK",
    });
    expect(restocked).toMatchObject({ stock: 15, version: 2 });

    const counted = await adjustStock(actor, product.id, 2, {
      mode: "SET",
      quantity: 3,
      reason: "INVENTORY",
      note: "comptage",
    });
    expect(counted.stock).toBe(3);

    await expect(
      adjustStock(actor, product.id, 3, {
        mode: "DELTA",
        quantity: -4,
        reason: "DAMAGE",
      }),
    ).rejects.toMatchObject({ code: "NEGATIVE_STOCK" });

    const activity = await getProductActivity(product.id, 10);
    expect(activity.map((entry) => entry.action)).toEqual([
      "STOCK_ADJUST",
      "STOCK_ADJUST",
      "CREATE",
    ]);
  });

  it("archives and restores as a draft, and refuses to edit an archived product", async () => {
    const values = input();
    const product = await createProduct(actor, values);

    const archived = await archiveProduct(actor, product.id, 1);
    expect(archived).toMatchObject({ status: "ARCHIVED", version: 2 });
    expect(archived.archivedAt).toBeDefined();

    await expect(
      updateProduct(actor, product.id, 2, update(values)),
    ).rejects.toMatchObject({ code: "PRODUCT_ARCHIVED" });

    const restored = await restoreProduct(actor, product.id, 2);
    expect(restored).toMatchObject({ status: "DRAFT", version: 3 });
    expect(restored.archivedAt).toBeUndefined();
  });

  it("refuses to delete a product still in a cart", async () => {
    const product = await createProduct(actor, input());
    await db().send(
      new PutCommand({
        TableName: table("Carts"),
        Item: {
          userId: `usr_${randomUUID()}`,
          productId: product.id,
          quantity: 1,
        },
      }),
    );

    expect(await getProductUsage(product.id)).toEqual({
      carts: 1,
      wishlists: 0,
    });
    await expect(deleteProduct(actor, product.id)).rejects.toMatchObject({
      code: "PRODUCT_IN_USE",
    });
  });

  it("deletes a product and frees its SKU", async () => {
    const values = input();
    const product = await createProduct(actor, values);

    await deleteProduct(actor, product.id);

    expect(await getProduct(product.id)).toBeNull();
    await expect(
      createProduct(actor, input({ sku: values.sku })),
    ).resolves.toBeTruthy();
  });

  it("keeps the dashboard counters exact through a product's life", async () => {
    const globalBefore = await readStats("GLOBAL");

    const product = await createProduct(
      actor,
      input({ categoryId: categoryB, stock: 2 }),
    );
    let v = product.version;
    // Low stock → out of stock → moved to another category → archived → restored → deleted.
    v = (
      await adjustStock(actor, product.id, v, {
        mode: "SET",
        quantity: 0,
        reason: "INVENTORY",
      })
    ).version;
    const values = { ...update(input()), sku: product.sku, slug: product.slug };
    v = (
      await updateProduct(actor, product.id, v, {
        ...values,
        categoryId: categoryA,
      })
    ).version;

    expect(await readStats(`CATEGORY#${categoryB}`)).toMatchObject({
      productCount: 0,
    });
    const withOutOfStock = await readStats("GLOBAL");
    expect(withOutOfStock.totalProducts - globalBefore.totalProducts).toBe(1);
    expect(withOutOfStock.outOfStock - globalBefore.outOfStock).toBe(1);
    expect(withOutOfStock.lowStock - globalBefore.lowStock).toBe(0);

    v = (await archiveProduct(actor, product.id, v)).version;
    v = (await restoreProduct(actor, product.id, v)).version;
    await deleteProduct(actor, product.id);

    const after = await readStats("GLOBAL");
    expect(after.totalProducts).toBe(globalBefore.totalProducts);
    expect(after.outOfStock).toBe(globalBefore.outOfStock);
    expect(after.lowStock).toBe(globalBefore.lowStock);
  });

  it("lists, searches and filters through the status index", async () => {
    const tag = randomUUID().slice(0, 8);
    const kept = await createProduct(
      actor,
      input({ name: `Lampe Été ${tag}` }),
    );
    const draft = await createProduct(
      actor,
      input({ name: `Lampe brouillon ${tag}`, status: "DRAFT" }),
    );
    const gone = await createProduct(
      actor,
      input({ name: `Lampe archivée ${tag}` }),
    );
    await archiveProduct(actor, gone.id, 1);

    const current = await listProducts({
      q: `lampe ete ${tag}`,
      status: "current",
      sort: "name",
      page: 1,
    });
    expect(current.items.map((item) => item.id)).toEqual([kept.id]);

    const all = await listProducts({
      q: tag,
      status: "current",
      sort: "name",
      page: 1,
    });
    expect(all.items.map((item) => item.id).sort()).toEqual(
      [kept.id, draft.id].sort(),
    );

    const archived = await listProducts({
      q: tag,
      status: "ARCHIVED",
      sort: "name",
      page: 1,
    });
    expect(archived.items.map((item) => item.id)).toEqual([gone.id]);
  });
});
