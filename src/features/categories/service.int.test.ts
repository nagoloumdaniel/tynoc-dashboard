import { randomUUID } from "node:crypto";
import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { describe, expect, it } from "vitest";
import { createProduct } from "@/features/products/service";
import { db, table } from "@/lib/aws/dynamodb";
import type { Session } from "@/lib/auth/session";
import type { CategoryInput } from "./schemas";
import {
  createCategory,
  deleteCategory,
  getCategory,
  isCategoryUsable,
  listCategoryTree,
  setCategoryActive,
  updateCategory,
} from "./service";
import { ROOT_PARENT } from "./types";

const actor: Session = {
  userId: "usr_test",
  email: "admin@example.com",
  name: "Admin",
  role: "SUPER_ADMIN",
};

function input(overrides: Partial<CategoryInput> = {}): CategoryInput {
  const unique = randomUUID().slice(0, 8);
  return {
    name: `Catégorie ${unique}`,
    slug: `categorie-${unique}`,
    description: undefined,
    parentId: ROOT_PARENT,
    sortOrder: 10,
    isActive: true,
    ...overrides,
  };
}

async function totalCategories() {
  const { Item } = await db().send(
    new GetCommand({
      TableName: table("Stats"),
      Key: { pk: "GLOBAL" },
      ConsistentRead: true,
    }),
  );
  return Number(Item?.totalCategories ?? 0);
}

async function addProduct(categoryId: string) {
  const unique = randomUUID().slice(0, 8);
  return createProduct(actor, {
    name: `Produit ${unique}`,
    slug: `produit-${unique}`,
    sku: `P-${unique.toUpperCase()}`,
    description: undefined,
    categoryId,
    priceInCents: 1000,
    salePriceInCents: undefined,
    stock: 3,
    lowStockThreshold: 5,
    status: "ACTIVE",
  });
}

describe("category service", () => {
  it("creates a top-level category and a sub-category", async () => {
    const parent = await createCategory(actor, input());
    const child = await createCategory(actor, input({ parentId: parent.id }));

    expect(parent).toMatchObject({ parentId: ROOT_PARENT, version: 1 });
    expect(parent.id).toMatch(/^cat_/);
    expect(await getCategory(child.id)).toEqual(child);

    const node = (await listCategoryTree()).find((n) => n.id === parent.id);
    expect(node?.children.map((c) => c.id)).toEqual([child.id]);
  });

  it("refuses a duplicate slug", async () => {
    const first = await createCategory(actor, input());
    await expect(
      createCategory(actor, input({ slug: first.slug })),
    ).rejects.toMatchObject({ code: "CATEGORY_SLUG_TAKEN", status: 409 });
  });

  it("refuses a sub-category or a missing category as parent", async () => {
    const parent = await createCategory(actor, input());
    const child = await createCategory(actor, input({ parentId: parent.id }));

    await expect(
      createCategory(actor, input({ parentId: child.id })),
    ).rejects.toMatchObject({ code: "PARENT_INVALID" });
    await expect(
      createCategory(actor, input({ parentId: "cat_missing" })),
    ).rejects.toMatchObject({ code: "PARENT_INVALID" });
  });

  it("updates the slug and frees the old one", async () => {
    const values = input();
    const category = await createCategory(actor, values);
    const newSlug = `renamed-${randomUUID().slice(0, 8)}`;

    const updated = await updateCategory(actor, category.id, 1, {
      ...values,
      name: "Renommée",
      slug: newSlug,
    });

    expect(updated).toMatchObject({
      name: "Renommée",
      slug: newSlug,
      version: 2,
    });
    await expect(
      createCategory(actor, input({ slug: values.slug })),
    ).resolves.toBeTruthy();
  });

  it("keeps a parent with children at the top level", async () => {
    const values = input();
    const parent = await createCategory(actor, values);
    await createCategory(actor, input({ parentId: parent.id }));
    const other = await createCategory(actor, input());

    await expect(
      updateCategory(actor, parent.id, 1, { ...values, parentId: other.id }),
    ).rejects.toMatchObject({ code: "CATEGORY_HAS_CHILDREN" });
  });

  it("detects a concurrent change, including on a category without version", async () => {
    const values = input();
    const category = await createCategory(actor, values);
    await updateCategory(actor, category.id, 1, { ...values, name: "V2" });
    await expect(
      updateCategory(actor, category.id, 1, { ...values, name: "Stale" }),
    ).rejects.toMatchObject({ code: "VERSION_CONFLICT" });

    // Categories seeded before phase 4 have no version attribute.
    const legacy = { ...input(), id: `cat_legacy-${randomUUID().slice(0, 8)}` };
    await db().send(
      new PutCommand({
        TableName: table("Categories"),
        Item: {
          ...legacy,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }),
    );
    const { id: _id, ...legacyInput } = legacy;
    await expect(
      updateCategory(actor, legacy.id, 1, { ...legacyInput, name: "Migrée" }),
    ).resolves.toMatchObject({ name: "Migrée", version: 2 });
  });

  it("treats a sub-category of an inactive parent as unusable", async () => {
    const parent = await createCategory(actor, input());
    const child = await createCategory(actor, input({ parentId: parent.id }));
    expect(await isCategoryUsable(child.id)).toBe(true);

    await setCategoryActive(actor, parent.id, 1, false);

    expect(await isCategoryUsable(parent.id)).toBe(false);
    expect(await isCategoryUsable(child.id)).toBe(false);
  });

  it("refuses to delete a category with children or products", async () => {
    const parent = await createCategory(actor, input());
    const child = await createCategory(actor, input({ parentId: parent.id }));

    await expect(deleteCategory(actor, parent.id, 1)).rejects.toMatchObject({
      code: "CATEGORY_HAS_CHILDREN",
    });

    await addProduct(child.id);
    await expect(deleteCategory(actor, child.id, 1)).rejects.toMatchObject({
      code: "CATEGORY_NOT_EMPTY",
    });
  });

  it("shows children's products in the parent's total", async () => {
    const parent = await createCategory(actor, input());
    const child = await createCategory(actor, input({ parentId: parent.id }));
    await addProduct(parent.id);
    await addProduct(child.id);
    await addProduct(child.id);

    const node = (await listCategoryTree()).find((n) => n.id === parent.id);
    expect(node).toMatchObject({ ownProductCount: 1, productCount: 3 });
  });

  it("deletes an empty category and keeps the category count exact", async () => {
    const before = await totalCategories();
    const values = input();
    const category = await createCategory(actor, values);
    expect(await totalCategories()).toBe(before + 1);

    await deleteCategory(actor, category.id, 1);

    expect(await getCategory(category.id)).toBeNull();
    expect(await totalCategories()).toBe(before);
    await expect(
      createCategory(actor, input({ slug: values.slug })),
    ).resolves.toBeTruthy();
  });
});
